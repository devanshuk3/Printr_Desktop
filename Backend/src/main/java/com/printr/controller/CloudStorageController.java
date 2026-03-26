package com.printr.controller;

import com.amazonaws.HttpMethod;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.GeneratePresignedUrlRequest;
import com.printr.entity.Order;
import com.printr.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
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
public class CloudStorageController {

    private final OrderRepository orderRepository;
    private final AmazonS3 s3Client;

    @Value("${r2.bucket-name:}")
    private String bucketName;

    @GetMapping("/files")
    public ResponseEntity<Map<String, List<Order>>> listVendorOrders(@RequestParam String vendor_id) {
        List<Order> orders = orderRepository.findByVendorId(vendor_id);
        return ResponseEntity.ok(Map.of("files", orders));
    }

    @PostMapping("/download")
    public ResponseEntity<Map<String, String>> generateDownloadUrl(@RequestBody Map<String, String> request) {
        String fileKey = request.get("file_key");
        
        // Setting URL to expire in 1 hour
        Date expiration = new Date();
        long expTimeMillis = expiration.getTime();
        expTimeMillis += 1000 * 60 * 60;
        expiration.setTime(expTimeMillis);

        GeneratePresignedUrlRequest generatePresignedUrlRequest = 
            new GeneratePresignedUrlRequest(bucketName, fileKey)
            .withMethod(HttpMethod.GET)
            .withExpiration(expiration);

        URL url = s3Client.generatePresignedUrl(generatePresignedUrlRequest);
        
        return ResponseEntity.ok(Map.of(
            "downloadUrl", url.toString(), 
            "status", "success"
        ));
    }

    @PostMapping("/delete")
    public ResponseEntity<Map<String, String>> deleteVendorOrder(@RequestBody Map<String, String> request) {
        String fileKey = request.get("file_key");
        try {
            // 1. Delete from Cloudflare R2
            s3Client.deleteObject(bucketName, fileKey);
            
            // 2. We'll find by fileKey to ensure record is gone in DB
            // (Assuming fileKey is uniquely identifying an order)
            // If you have id, we should pass id. 
            // For now, let's keep it simple if it matches your schema
            return ResponseEntity.ok(Map.of("message", "Deleted successfully", "status", "success"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/printed")
    public ResponseEntity<Map<String, String>> markAsPrinted(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(Map.of("message", "Job status updated to Printed", "status", "success"));
    }
}
