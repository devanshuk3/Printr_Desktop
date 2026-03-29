package com.printr.config;

import org.springframework.context.annotation.Configuration;

/**
 * Database configuration is handled via application.properties.
 * 
 * On Render: Set SPRING_DATASOURCE_URL, SPRING_DATASOURCE_USERNAME, 
 * and SPRING_DATASOURCE_PASSWORD environment variables.
 * 
 * Locally: Falls back to defaults in application.properties.
 * 
 * Using Supabase Transaction Pooler (port 6543) for production
 * to support 1000+ concurrent users without exhausting connection limits.
 */
@Configuration
public class DatabaseConfig {
    // Intentionally empty - Spring Boot auto-configures DataSource from properties
}
