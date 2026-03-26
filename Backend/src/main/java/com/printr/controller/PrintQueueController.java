package com.printr.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

@RestController
@RequestMapping("/api")
public class PrintQueueController {

    @GetMapping("/print-queue")
    public ResponseEntity<List<Map<String, Object>>> getPrintQueue() {
        // TODO: Logic to fetch queue from DB and match with R2 files
        List<Map<String, Object>> mockQueue = new ArrayList<>();
        mockQueue.add(Map.of("id", "#ORD-7721", "file", "Thesis_Final.pdf", "customer", "John Doe", "status", "Pending", "pages", 42));
        mockQueue.add(Map.of("id", "#ORD-7722", "file", "Passport_Scan.jpg", "customer", "Jane Smith", "status", "In Progress", "pages", 1));
        return ResponseEntity.ok(mockQueue);
    }

    @PostMapping("/print-queue/add")
    public ResponseEntity<Map<String, String>> addToQueue(@RequestBody Map<String, Object> jobData) {
        // TODO: Store metadata in DB and handle R2 reference
        return ResponseEntity.ok(Map.of("message", "Job added to queue", "status", "success"));
    }
}
