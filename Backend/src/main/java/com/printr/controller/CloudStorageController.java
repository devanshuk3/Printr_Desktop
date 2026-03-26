package com.printr.controller;

import com.printr.entity.Order;
import com.printr.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/r2")
@RequiredArgsConstructor
public class CloudStorageController {

    private final OrderRepository orderRepository;

    @GetMapping("/files")
    public ResponseEntity<Map<String, List<Order>>> listVendorOrders(@RequestParam String vendor_id) {
        // Fetch from Database (metadata) as requested
        List<Order> orders = orderRepository.findByVendorId(vendor_id);
        return ResponseEntity.ok(Map.of("files", orders));
    }

    @PostMapping("/download")
    public ResponseEntity<Map<String, String>> generateDownloadUrl(@RequestBody Map<String, String> request) {
        String fileKey = request.get("file_key");
        // TODO: Generate ACTUAL pre-signed R2 URL using S3 Client
        String mockUrl = "https://7cff4c3d228e69e58138ff0417e28a00.r2.cloudflarestorage.com/printr/" + fileKey;
        return ResponseEntity.ok(Map.of("downloadUrl", mockUrl, "status", "success"));
    }

    @PostMapping("/printed")
    public ResponseEntity<Map<String, String>> markAsPrinted(@RequestBody Map<String, String> request) {
        // Business logic to update status in the database would go here
        return ResponseEntity.ok(Map.of("message", "Job status updated to Printed", "status", "success"));
    }
}
