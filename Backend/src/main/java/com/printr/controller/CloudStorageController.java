package com.printr.controller;

import com.amazonaws.HttpMethod;
import com.amazonaws.services.s3.AmazonS3;
import com.printr.entity.Order;
import com.printr.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.net.URL;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/r2")
@RequiredArgsConstructor
@Slf4j
public class CloudStorageController {

    private final OrderRepository orderRepository;
    private final AmazonS3 s3Client;

    @Value("${r2.bucket-name:}")
    private String bucketName;

    @GetMapping("/files")
    public ResponseEntity<Map<String, List<Order>>> listVendorOrders(@RequestParam String vendor_id) {
        log.info("Fetching orders for vendor: {}", vendor_id);
        List<Order> allOrders = orderRepository.findByVendorId(vendor_id);

        // Filter out .xml files and only show pending/in-progress jobs
        List<Order> printableOrders = allOrders.stream()
                .filter(o -> o.getFileName() != null && !o.getFileName().toLowerCase().endsWith(".xml"))
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(Map.of("files", printableOrders));
    }

    @PostMapping("/download")
    public ResponseEntity<Map<String, String>> generateDownloadUrl(@RequestBody Map<String, Object> request) {
        String fileKeyFromReq = (String) request.get("file_key");
        Object idObj = request.get("id");
        Long id = idObj != null ? Long.valueOf(idObj.toString()) : null;

        String fileKey = fileKeyFromReq;
        String vendorId = null;

        // Find the record to get the definitively current info and vendorId
        if (id != null) {
            Optional<Order> order = orderRepository.findById(id);
            if (order.isPresent()) {
                vendorId = order.get().getVendorId();
                fileKey = order.get().getFileKey();
                if (fileKey == null) {
                    fileKey = order.get().getFileName();
                }
            }
        }

        if (fileKey == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "file_key is required"));
        }

        // Prepend vendor_id folder if missing
        String fullKey = fileKey;
        if (vendorId != null && !fileKey.startsWith(vendorId + "/")) {
            fullKey = vendorId + "/" + fileKey;
        }

        log.info("Generating secure link for full path: {}", fullKey);

        try {
            Date expiration = new Date(System.currentTimeMillis() + 3600000); // 1 hour
            URL url = s3Client.generatePresignedUrl(bucketName, fullKey, expiration, HttpMethod.GET);

            return ResponseEntity.ok(Map.of(
                    "downloadUrl", url.toString(),
                    "status", "success"));
        } catch (Exception e) {
            log.error("Failed to generate pre-signed URL for {}: {}", fullKey, e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/delete")
    public ResponseEntity<Map<String, String>> deleteVendorOrder(@RequestBody Map<String, Object> request) {
        String fileKey = (String) request.get("file_key");
        Object idObj = request.get("id");
        Long id = idObj != null ? Long.valueOf(idObj.toString()) : null;

        log.info("Cancelling and removing order. ID: {}, Key: {}", id, fileKey);
        try {
            String vendorId = null;
            String resolvedFileKey = fileKey;

            // Find the order to get vendor info before deleting
            if (id != null) {
                Optional<Order> order = orderRepository.findById(id);
                if (order.isPresent()) {
                    vendorId = order.get().getVendorId();
                    resolvedFileKey = order.get().getFileKey();
                    if (resolvedFileKey == null) {
                        resolvedFileKey = order.get().getFileName();
                    }
                    // Delete the order from the database
                    orderRepository.deleteById(id);
                    log.info("Order {} deleted from database.", id);
                } else {
                    return ResponseEntity.badRequest().body(Map.of("message", "Order not found", "status", "error"));
                }
            } else if (fileKey != null) {
                Optional<Order> orderOpt = orderRepository.findByFileKey(fileKey);
                if (orderOpt.isPresent()) {
                    vendorId = orderOpt.get().getVendorId();
                    orderRepository.delete(orderOpt.get());
                    log.info("Order with key {} deleted from database.", fileKey);
                }
            }

            // Also delete the file from R2 storage
            if (resolvedFileKey != null && vendorId != null) {
                String fullKey = resolvedFileKey.startsWith(vendorId + "/") ? resolvedFileKey : vendorId + "/" + resolvedFileKey;
                try {
                    s3Client.deleteObject(bucketName, fullKey);
                    log.info("File {} deleted from R2 storage.", fullKey);
                } catch (Exception e) {
                    log.warn("Could not delete file from R2 (may already be removed): {}", e.getMessage());
                }
            }

            return ResponseEntity.ok(Map.of("message", "Order cancelled and removed", "status", "success"));
        } catch (Exception e) {
            log.error("Cancel failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/printed")
    public ResponseEntity<Map<String, String>> markAsPrinted(@RequestBody Map<String, Object> request) {
        String fileKey = (String) request.get("file_key");
        Object idObj = request.get("id");
        Long id = idObj != null ? Long.valueOf(idObj.toString()) : null;

        log.info("Marking order as printed. ID: {}, Key: {}", id, fileKey);
        try {
            if (id != null) {
                orderRepository.findById(id).ifPresent(order -> {
                    order.setStatus("Printed");
                    orderRepository.save(order);
                });
            } else if (fileKey != null) {
                orderRepository.findByFileKey(fileKey).ifPresent(order -> {
                    order.setStatus("Printed");
                    orderRepository.save(order);
                });
            }
            return ResponseEntity.ok(Map.of("message", "Status updated to Printed", "status", "success"));
        } catch (Exception e) {
            log.error("Status update failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }
}
