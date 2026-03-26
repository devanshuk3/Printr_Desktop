package com.printr.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.jdbc.DataSourceBuilder;
import javax.sql.DataSource;
import java.net.URI;
import java.net.URISyntaxException;

@Configuration
public class DatabaseConfig {

    @Bean
    public DataSource dataSource() {
        String databaseUrl = System.getenv("DATABASE_URL");
        
        // Use local properties if DATABASE_URL is not set (for local dev)
        if (databaseUrl == null || databaseUrl.isEmpty()) {
            return null; // Spring will fall back to application.properties
        }

        try {
            URI uri = new URI(databaseUrl);
            String userInfo = uri.getUserInfo();
            String username = userInfo.split(":")[0];
            String password = userInfo.split(":")[1];
            String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ":" + uri.getPort() + uri.getPath();

            return DataSourceBuilder.create()
                    .url(jdbcUrl)
                    .username(username)
                    .password(password)
                    .driverClassName("org.postgresql.Driver")
                    .build();
        } catch (URISyntaxException | ArrayIndexOutOfBoundsException e) {
            System.err.println("Error parsing DATABASE_URL: " + e.getMessage());
            return null; // Fallback
        }
    }
}
