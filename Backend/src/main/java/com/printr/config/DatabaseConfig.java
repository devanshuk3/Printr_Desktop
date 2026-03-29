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
        
        String url, username, password;
        
        if (databaseUrl != null && !databaseUrl.isEmpty()) {
            try {
                URI uri = new URI(databaseUrl);
                String userInfo = uri.getUserInfo();
                username = userInfo.split(":")[0];
                password = userInfo.split(":")[1];
                url = "jdbc:postgresql://" + uri.getHost() + ":" + uri.getPort() + uri.getPath();
            } catch (URISyntaxException | ArrayIndexOutOfBoundsException e) {
                System.err.println("Error parsing DATABASE_URL: " + e.getMessage());
                // Fallback to defaults
                url = "jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
                username = "postgres.jduoonbxrlmifpctncnl";
                password = "Yadav@5467890";
            }
        } else {
            // Development/Local defaults mapping to live Supabase
            url = "jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
            username = "postgres.jduoonbxrlmifpctncnl";
            password = "Yadav@5467890";
        }

        return DataSourceBuilder.create()
                .url(url)
                .username(username)
                .password(password)
                .driverClassName("org.postgresql.Driver")
                .build();
    }
}
