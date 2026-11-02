package vn.ShuttleHub.backend.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Sinh & verify JWT access token + refresh token.
 *  • Access: 15 phút, gửi kèm mỗi request (header Authorization: Bearer ...)
 *  • Refresh: 7 ngày, chỉ dùng để lấy access token mới, LƯU HASH trong DB
 *    để thực hiện rotation (mỗi lần refresh → token cũ bị vô hiệu hoá)
 */
@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long accessExpirationMs;
    private final long refreshExpirationMs;
    private final String issuer;

    public JwtService(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.access-token-expiration}") long accessExpirationMs,
        @Value("${app.jwt.refresh-token-expiration}") long refreshExpirationMs,
        @Value("${app.jwt.issuer}") String issuer
    ) {
        // Secret phải >= 256 bit (32 bytes). Nếu thiếu thì báo lỗi ngay khi start.
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalArgumentException(
                "JWT secret phải >= 256 bit (32 bytes). Hiện tại: " + keyBytes.length + " bytes."
            );
        }
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        this.accessExpirationMs = accessExpirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
        this.issuer = issuer;
    }

    public String generateAccessToken(String userId, String email, String role) {
        return buildToken(userId, email, role, "access", accessExpirationMs);
    }

    public String generateRefreshToken(String userId, String email, String role) {
        return buildToken(userId, email, role, "refresh", refreshExpirationMs);
    }

    private String buildToken(String userId, String email, String role, String type, long expirationMs) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
            .id(UUID.randomUUID().toString())
            .issuer(issuer)
            .subject(userId)
            .claim("email", email)
            .claim("role", role)
            .claim("type", type)
            .issuedAt(now)
            .expiration(expiry)
            .signWith(secretKey)
            .compact();
    }

    /**
     * Parse token, ném JwtException nếu sai/signature fail/hết hạn.
     */
    public Claims parse(String token) {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    /**
     * Parse access token — BẮT BUỘC phải có type = "access".
     * Nếu không, refresh token (type=refresh) có thể lọt vào xác thực API.
     */
    public Claims parseAccessToken(String token) {
        Claims claims = parse(token);
        if (!"access".equals(claims.get("type"))) {
            throw new JwtException("Token không phải access token");
        }
        return claims;
    }

    /**
     * Lấy userId từ refresh token, verify còn hạn, đúng type.
     */
    public Claims parseRefreshToken(String token) {
        Claims claims = parse(token);
        if (!"refresh".equals(claims.get("type"))) {
            throw new JwtException("Token không phải refresh token");
        }
        return claims;
    }

    public long getAccessExpirationSeconds() {
        return accessExpirationMs / 1000;
    }

    public long getRefreshExpirationMs() {
        return refreshExpirationMs;
    }

    /**
     * Hạn refresh token tính bằng GIÂY (để dùng với LocalDateTime.plusSeconds).
     */
    public long getRefreshExpirationSeconds() {
        return refreshExpirationMs / 1000;
    }

    /**
     * SHA-256 hash của refresh token — dùng để lưu trong DB.
     * KHÔNG lưu token gốc (nếu DB bị lộ, attacker cũng không dùng được).
     */
    public String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 không khả dụng", e);
        }
    }
}
