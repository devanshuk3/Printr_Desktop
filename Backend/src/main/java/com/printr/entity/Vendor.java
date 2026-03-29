package com.printr.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "vendors")
@Data
public class Vendor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vendor_id", unique = true, nullable = false)
    @JsonProperty("vendor_id")
    private String vendorId;

    @Column(nullable = false)
    private String password;

    @Column(name = "full_name")
    @JsonProperty("full_name")
    private String fullName;

    @Column(name = "shop_name")
    @JsonProperty("shop_name")
    private String shopName;

    private String phone;

    @Column(name = "upi_id")
    @JsonProperty("upi_id")
    private String upiId;

    private String address;

    @Column(name = "bw_price")
    @JsonProperty("bw_price")
    private Double bwPrice;

    @Column(name = "color_price")
    @JsonProperty("color_price")
    private Double colorPrice;

    @Column(name = "paper_sizes")
    @JsonProperty("paper_sizes")
    private String paperSizes;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
