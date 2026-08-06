# 11 — Deployment Architecture

**Project:** University Course Evaluation System (UCES)  
**Phase:** 2 — System Design  
**Document Version:** 1.0

---

## 1. Deployment Strategy

UCES is deployed as a **Dockerised monolith** on a university-managed server (or compliant cloud VM). All services run as Docker containers orchestrated with Docker Compose. This approach:

- Eliminates environment inconsistency between dev/staging/prod.
- Runs on a single VM for cost-effective university hosting.
- Allows future migration to Kubernetes with minimal code changes.

---

## 2. Environment Matrix

| Environment | Purpose | Infrastructure |
|---|---|---|
| **Development** | Local developer machines | Docker Compose; hot-reload |
| **Staging** | Pre-production QA & UAT | Same Docker Compose stack; separate data volume |
| **Production** | Live university system | Docker Compose on university server; automated backups |

---

## 3. Container Architecture

```mermaid
graph TD
    subgraph "University Server / Cloud VM"
        direction TB

        subgraph "Docker Network: uces_net"
            NGINX["🔷 nginx\nPort 443 (HTTPS)\nPort 80 (redirect)\nStatic files + Reverse proxy"]

            API["🟩 api\n(Node.js 20 + Express)\nPort 3001\nStateless — scalable"]

            DB["🟦 postgres\n(PostgreSQL 16)\nPort 5432\nVolume: postgres_data"]

            REDIS["🟥 redis\n(Redis 7)\nPort 6379\nVolume: redis_data"]

            WORKER["🟧 worker\n(BullMQ consumer)\nSame image as api\nCMD: node worker.js"]
        end

        subgraph "Volumes"
            VOL_PG["postgres_data"]
            VOL_REDIS["redis_data"]
            VOL_EXPORTS["exports_data\n(PDF/CSV files)"]
            VOL_LOGS["logs_data"]
        end

        CERT["🔐 Let's Encrypt\nCertbot (sidecar)\nAuto-renewal"]
    end

    subgraph "External Services"
        SMTP["📧 SMTP Relay\n(institutional or SendGrid)"]
        SIS["🏫 SIS API\n(optional enrollment sync)"]
    end

    Internet -->|"HTTPS :443"| NGINX
    NGINX -->|"Proxy /api/*"| API
    NGINX -->|"Static /assets"| NGINX
    API -->|"TCP :5432"| DB
    API -->|"TCP :6379"| REDIS
    WORKER -->|"TCP :6379"| REDIS
    WORKER -->|"TCP :5432"| DB
    WORKER -->|"SMTP"| SMTP
    API -->|"REST"| SIS

    DB --- VOL_PG
    REDIS --- VOL_REDIS
    API --- VOL_EXPORTS
    API --- VOL_LOGS
    NGINX --- CERT
```

---

## 4. Docker Compose Configuration

```yaml
# docker-compose.yml (production)
version: "3.9"

services:

  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./client/dist:/usr/share/nginx/html:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - uces_net

  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://uces_app:${DB_PASSWORD}@postgres:5432/uces
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      APP_URL: ${APP_URL}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    networks:
      - uces_net
    volumes:
      - exports_data:/app/exports
      - logs_data:/app/logs

  worker:
    build:
      context: ./server
      dockerfile: Dockerfile
    command: node dist/worker.js
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://uces_app:${DB_PASSWORD}@postgres:5432/uces
      REDIS_URL: redis://redis:6379
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - uces_net

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: uces
      POSTGRES_USER: uces_app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/prisma/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U uces_app -d uces"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - uces_net

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - uces_net

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: >
      /bin/sh -c "trap exit TERM;
      while :; do certbot renew; sleep 12h & wait $${!}; done"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  exports_data:
  logs_data:

networks:
  uces_net:
    driver: bridge
```

---

## 5. Nginx Configuration

```nginx
# nginx/nginx.conf
upstream api_backend {
    server api:3001;
}

server {
    listen 80;
    server_name uces.uni.edu;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name uces.uni.edu;

    ssl_certificate     /etc/letsencrypt/live/uces.uni.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/uces.uni.edu/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Serve React SPA
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api/ {
        proxy_pass         http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection keep-alive;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

---

## 6. CI/CD Pipeline

```mermaid
flowchart LR
    DEV["Developer\npushes code"] -->|"git push"| GH["GitHub\nRepository"]
    GH --> CI["GitHub Actions\nCI Pipeline"]

    subgraph CI["GitHub Actions Pipeline"]
        direction TB
        L["1 Lint\n(ESLint + tsc)"]
        T["2 Unit Tests\n(Jest + Vitest)"]
        B["3 Build\n(Docker images)"]
        S["4 Security Scan\n(npm audit + Trivy)"]
        P["5 Push Images\n(GitHub Container Registry)"]
        D["6 Deploy\n(SSH → docker compose pull && up -d)"]
        L --> T --> B --> S --> P --> D
    end

    D --> STAGING["Staging Server"]
    STAGING -->|"Manual approval"| PROD["Production Server"]
```

### Pipeline Jobs

```yaml
# .github/workflows/ci.yml (summary)
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run lint && npm run typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_DB: uces_test, POSTGRES_PASSWORD: test }
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run test:coverage

  build-and-push:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/org/uces-api:${{ github.sha }}

  deploy-staging:
    needs: build-and-push
    if: github.ref == 'refs/heads/develop'
    steps:
      - run: ssh deploy@staging "cd /app && docker compose pull && docker compose up -d"
```

---

## 7. Environment Variables Reference

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/uces` |
| `REDIS_URL` | Redis connection string | `redis://:pass@redis:6379` |
| `REDIS_PASSWORD` | Redis auth password | `str0ngP@ss` |
| `DB_PASSWORD` | PostgreSQL app user password | `str0ngP@ss` |
| `JWT_SECRET` | HMAC secret for access tokens | 64-char random hex |
| `JWT_REFRESH_SECRET` | HMAC secret for refresh tokens | 64-char random hex |
| `SMTP_HOST` | Email relay host | `smtp.uni.edu` |
| `SMTP_PORT` | Email relay port | `587` |
| `SMTP_USER` | SMTP username | `uces@uni.edu` |
| `SMTP_PASS` | SMTP password | — |
| `APP_URL` | Public URL for email links | `https://uces.uni.edu` |
| `NODE_ENV` | Environment | `production` |
| `LOG_LEVEL` | Winston log level | `info` |

> All secrets are stored in `.env` (never committed) and injected at container startup. In production, use a secrets manager (Vault, AWS Secrets Manager, or university-provided secret store).

---

## 8. Backup & Monitoring

### Backup
```bash
# Daily automated backup (cron on host)
0 2 * * * docker exec uces-postgres pg_dump -U uces_app uces | \
  gzip > /backups/uces_$(date +\%Y\%m\%d).sql.gz
```

### Health Checks
- **API:** `GET /api/v1/health` → `{ status: "ok", db: "ok", redis: "ok" }`
- **Database:** `pg_isready` in Docker healthcheck.
- **Uptime monitoring:** University IT can use Uptime Kuma or similar to ping the health endpoint every 60 seconds.

### Logging
- All API logs → `logs/` volume → structured JSON.
- Parseable by Grafana Loki, ELK stack, or simple `docker logs` in minimal setup.
