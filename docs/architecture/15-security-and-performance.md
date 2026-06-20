# 15. Security and Performance

## 15.1 Security Measures

| Area                 | Implementation                                   |
| -------------------- | ------------------------------------------------ |
| **Authentication**   | Telegram initData HMAC validation, JWT for admin |
| **API Security**     | Rate limiting (100 req/min), CORS whitelist      |
| **Data Protection**  | bcrypt for admin passwords, no PII logging       |
| **HTTPS**            | Let's Encrypt certificates, HSTS headers         |
| **Input Validation** | class-validator DTOs, sanitize all inputs        |
| **SQL Injection**    | TypeORM parameterized queries                    |
| **XSS**              | React auto-escaping, CSP headers                 |

## 15.2 Performance Optimizations

| Area              | Implementation                                       |
| ----------------- | ---------------------------------------------------- |
| **Database**      | Connection pooling (20 connections), indexed queries |
| **Caching**       | In-memory cache for club info, training types        |
| **Images**        | Cloudinary auto-format, lazy loading                 |
| **Bundle Size**   | Vite code splitting, tree shaking                    |
| **API Responses** | Gzip compression, pagination                         |

## 15.3 Performance Targets

| Metric                | Target  |
| --------------------- | ------- |
| API Response (p95)    | < 200ms |
| Mini App TTI          | < 2s    |
| Bundle Size (gzipped) | < 100KB |
| Lighthouse Score      | > 90    |

---
