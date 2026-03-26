package com.printr.controller;

import com.amazonaws.HttpMethod;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.GeneratePresignedUrlRequest;
import com.amazonaws.services.s3.model.ResponseHeaderOverrides;
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

        // Try to find by ID to get the definitive current info
        if (id != null) {
            Optional<Order> order = orderRepository.findById(id);
            if (order.isPresent()) {
                fileKey = order.get().getFileKey();
                if (fileKey == null) {
                    fileKey = order.get().getFileName(); // Fallback to name if key is missing
                }
            }
        }

        if (fileKey == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "file_key is required"));
        }
        log.info("Generating pre-signed URL for bucket: {}, fileKey: {}", bucketName, fileKey);

        try {
            // Setting URL to expire in 1 hour
            Date expiration = new Date();
            long expTimeMillis = expiration.getTime();
            expTimeMillis += 1000 * 60 * 60;
            expiration.setTime(expTimeMillis);

            // Determine Content Type
            String contentType = "application/octet-stream";
            if (fileKey.toLowerCase().endsWith(".pdf"))
                contentType = "application/pdf";
            else if (fileKey.toLowerCase().endsWith(".jpg") || fileKey.toLowerCase().endsWith(".jpeg"))
                contentType = "image/jpeg";
            else if (fileKey.toLowerCase().endsWith(".png"))
                contentType = "image/png";

            ResponseHeaderOverrides overrides = new ResponseHeaderOverrides();
            overrides.setContentType(contentType);

            GeneratePresignedUrlRequest generatePresignedUrlRequest = new GeneratePresignedUrlRequest(bucketName,
                    fileKey)
                    .withMethod(HttpMethod.GET)
                    .withExpiration(expiration)
                    .withResponseHeaders(overrides);

            URL url = s3Client.generatePresignedUrl(generatePresignedUrlRequest);
            log.info("Generated URL: {}", url.toString());

            return ResponseEntity.ok(Map.of(
                    "downloadUrl", url.toString(),
                    "status", "success"));
        } catch (Exception e) {
            log.error("Failed to generate pre-signed URL: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/delete")
    public ResponseEntity<Map<String, String>> deleteVendorOrder(@RequestBody Map<String, Object> request) {
        String fileKey = (String) request.get("file_key");
        Object idObj = request.get("id");
        Long id = idObj != null ? Long.valueOf(idObj.toString()) : null;

        log.info("Cancelling order. ID: {}, Key: {}", id, fileKey);
        try {
            // Update Status in DB
            if (id != null) {
                orderRepository.findById(id).ifPresent(order -> {
                    order.setStatus("Cancelled");
                    orderRepository.save(order);
                });
            } else if (fileKey != null) {
                orderRepository.findByFileKey(fileKey).ifPresent(order -> {
                    order.setStatus("Cancelled");
                    orderRepository.save(order);
                });
            }

            // Preserve from deletion as requested, only update SQL status
            if (fileKey != null) {
                log.info("Skipping S3 deletion for cancelled order: {}, maintaining storage record.", fileKey);
            }

            return ResponseEntity.ok(Map.of("message", "Status updated to Cancelled", "status", "success"));
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
