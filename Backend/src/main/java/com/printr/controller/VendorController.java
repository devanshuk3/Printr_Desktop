package com.printr.controller;

import com.printr.entity.Vendor;
import com.printr.repository.VendorRepository;
import com.printr.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VendorController {

    private final JwtUtil jwtUtil;
    private final VendorRepository vendorRepository;

    @GetMapping("/verify-vendor")
    public ResponseEntity<Map<String, Object>> verifyVendor(@RequestParam String vendorId) {
        boolean exists = vendorRepository.findByVendorId(vendorId).isPresent();
        return ResponseEntity.ok(Map.of("verified", exists, "vendorId", vendorId));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String vendorId = credentials.get("vendor_id");
        String password = credentials.get("password");

        Optional<Vendor> vendor = vendorRepository.findByVendorId(vendorId);
        
        if (vendor.isPresent() && vendor.get().getPassword().equals(password)) {
            String token = jwtUtil.generateToken(vendorId);
            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "success", true,
                    "vendor_id", vendorId));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "message", "Invalid credentials"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, Object> data) {
        try {
            Vendor vendor = new Vendor();
            vendor.setVendorId((String) data.get("vendor_id"));
            vendor.setPassword((String) data.get("password"));
            vendor.setFullName((String) data.get("full_name"));
            vendor.setShopName((String) data.get("shop_name"));
            vendor.setPhone((String) data.get("phone"));
            vendor.setUpiId((String) data.get("upi_id"));
            vendor.setAddress((String) data.get("address"));
            
            // Handle numeric fields safely
            Object bw = data.get("bw_price");
            vendor.setBwPrice(bw != null ? Double.valueOf(bw.toString()) : 0.0);
            
            Object color = data.get("color_price");
            vendor.setColorPrice(color != null ? Double.valueOf(color.toString()) : 0.0);
            
            vendor.setPaperSizes((String) data.get("paper_sizes"));

            vendorRepository.save(vendor);

            String token = jwtUtil.generateToken(vendor.getVendorId());
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "token", token,
                    "success", true,
                    "message", "Account initialized successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "success", false,
                "message", "Registration failed: " + e.getMessage()));
        }
    }
}
