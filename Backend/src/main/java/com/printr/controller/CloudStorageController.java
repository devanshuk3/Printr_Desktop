package com.printr.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/r2")
public class CloudStorageController {

    @GetMapping("/files")
    public ResponseEntity<List<String>> listR2Files() {
        // TODO: S3 logic for listing R2 bucket contents
        return ResponseEntity.ok(List.of("Thesis_Final.pdf", "Passport_Scan.jpg", "Aadhar_Card.pdf"));
    }

    @GetMapping("/download")
    public ResponseEntity<Map<String, String>> generateDownloadUrl(@RequestParam String fileName) {
        // TODO: Generate pre-signed URL for fileName
        String mockUrl = "https://7cff4c3d228e69e58138ff0417e28a00.r2.cloudflarestorage.com/printr/" + fileName;
        return ResponseEntity.ok(Map.of("downloadUrl", mockUrl, "fileName", fileName, "status", "success"));
    }

    @PostMapping("/printed")
    public ResponseEntity<Map<String, String>> markAsPrinted(@RequestBody Map<String, String> request) {
        // TODO: Mark file as printed in DB and handle cleanup in R2 if needed
        return ResponseEntity.ok(Map.of("message", "Job status updated to Printed", "status", "success"));
    }
}
