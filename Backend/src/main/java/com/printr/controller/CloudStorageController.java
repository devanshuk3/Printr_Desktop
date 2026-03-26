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
    public ResponseEntity<Map<String, String>> generateDownloadUrl(@RequestBody Map<String, String> request) {
        String fileKey = request.get("file_key");
        log.info("Generating pre-signed URL for bucket: {}, fileKey: {}", bucketName, fileKey);
        
        try {
            // Setting URL to expire in 1 hour
            Date expiration = new Date();
            long expTimeMillis = expiration.getTime();
            expTimeMillis += 1000 * 60 * 60;
            expiration.setTime(expTimeMillis);

            // Determine Content Type
            String contentType = "application/octet-stream";
            if (fileKey.toLowerCase().endsWith(".pdf")) contentType = "application/pdf";
            else if (fileKey.toLowerCase().endsWith(".jpg") || fileKey.toLowerCase().endsWith(".jpeg")) contentType = "image/jpeg";
            else if (fileKey.toLowerCase().endsWith(".png")) contentType = "image/png";

            ResponseHeaderOverrides overrides = new ResponseHeaderOverrides();
            overrides.setContentType(contentType);

            GeneratePresignedUrlRequest generatePresignedUrlRequest = 
                new GeneratePresignedUrlRequest(bucketName, fileKey)
                .withMethod(HttpMethod.GET)
                .withExpiration(expiration)
                .withResponseHeaders(overrides);

            URL url = s3Client.generatePresignedUrl(generatePresignedUrlRequest);
            log.info("Generated URL: {}", url.toString());
            
            return ResponseEntity.ok(Map.of(
                "downloadUrl", url.toString(), 
                "status", "success"
            ));
        } catch (Exception e) {
            log.error("Failed to generate pre-signed URL: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/delete")
    public ResponseEntity<Map<String, String>> deleteVendorOrder(@RequestBody Map<String, String> request) {
        String fileKey = request.get("file_key");
        log.info("Cancelling order with fileKey: {}", fileKey);
        try {
            // Update Status in DB
            orderRepository.findByFileKey(fileKey).ifPresent(order -> {
                order.setStatus("Cancelled");
                orderRepository.save(order);
            });
            
            // Delete from Cloudflare R2 to save space
            s3Client.deleteObject(bucketName, fileKey);
            
            return ResponseEntity.ok(Map.of("message", "Cancelled successfully", "status", "success"));
        } catch (Exception e) {
            log.error("Cancel failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/printed")
    public ResponseEntity<Map<String, String>> markAsPrinted(@RequestBody Map<String, String> request) {
        String fileKey = request.get("file_key");
        log.info("Marking order as printed: {}", fileKey);
        try {
            orderRepository.findByFileKey(fileKey).ifPresent(order -> {
                order.setStatus("Printed");
                orderRepository.save(order);
            });
            return ResponseEntity.ok(Map.of("message", "Status updated to Printed", "status", "success"));
        } catch (Exception e) {
            log.error("Status update failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }
}
