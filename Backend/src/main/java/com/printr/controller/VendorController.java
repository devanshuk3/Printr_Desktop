package com.printr.controller;

import com.printr.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VendorController {

    private final JwtUtil jwtUtil;

    @GetMapping("/verify-vendor")
    public ResponseEntity<Map<String, Object>> verifyVendor(@RequestParam String vendorId) {
        return ResponseEntity.ok(Map.of("verified", true, "vendorId", vendorId));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String vendorId = credentials.get("vendor_id");
        // TODO: Validate password from DB!

        String token = jwtUtil.generateToken(vendorId);
        return ResponseEntity.ok(Map.of(
                "token", token,
                "success", true,
                "vendor_id", vendorId));
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, Object> vendorData) {
        String vendorId = (String) vendorData.get("vendor_id");
        // TODO: Save to DB!

        String token = jwtUtil.generateToken(vendorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "token", token,
                "success", true,
                "message", "Account initialized successfully"));
    }
}
