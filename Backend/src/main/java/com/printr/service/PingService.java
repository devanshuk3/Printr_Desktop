package com.printr.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class PingService {
    private static final Logger logger = LoggerFactory.getLogger(PingService.class);
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${PRINTR_BACKEND_URL:}")
    private String productionUrl;

    // Ping every 5 minutes (300,000 ms)
    @Scheduled(fixedRate = 300000)
    public void pingServer() {
        if (productionUrl == null || productionUrl.isBlank()) {
            return;
        }
        try {
            logger.info("Pinging Production Server to prevent sleeping: {}", productionUrl);
            restTemplate.getForObject(productionUrl + "/api/health", String.class);
            logger.info("Ping successful!");
        } catch (Exception e) {
            logger.warn("Ping failed, but that's okay (Server might be up anyway). Reason: {}", e.getMessage());
        }
    }
}
