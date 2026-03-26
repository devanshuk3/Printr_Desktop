package com.printr.config;

import com.amazonaws.auth.AWSCredentials;
import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.client.builder.AwsClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class S3Config {

    @Value("${r2.access-key:}")
    private String accessKey;

    @Value("${r2.secret-key:}")
    private String secretKey;

    @Value("${r2.endpoint:}")
    private String endpoint;

    @Bean
    public AmazonS3 s3Client() {
        // Clean endpoint string (ensure no bucket-specific prefix)
        String cleanEndpoint = endpoint;
        if (cleanEndpoint != null && cleanEndpoint.contains("://") && cleanEndpoint.split("/").length > 3) {
            // If it's something like https://bucket.account.r2.cloudflarestorage.com
            // we might want the account-level base
        }

        AWSCredentials credentials = new BasicAWSCredentials(accessKey, secretKey);
        return AmazonS3ClientBuilder.standard()
                .withCredentials(new AWSStaticCredentialsProvider(credentials))
                .withEndpointConfiguration(new AwsClientBuilder.EndpointConfiguration(cleanEndpoint, "auto"))
                .withPathStyleAccessEnabled(false) // R2 prefers Virtual Host style
                .build();
    }
}
