# 14. Deployment Architecture

## 14.1 Docker Compose (Production)

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
    nginx:
        image: nginx:alpine
        ports:
            - '80:80'
            - '443:443'
        volumes:
            - ./nginx/nginx.conf:/etc/nginx/nginx.conf
            - /etc/letsencrypt:/etc/letsencrypt
        depends_on:
            - api
            - mini-app
            - admin

    api:
        build:
            context: ..
            dockerfile: docker/Dockerfile.api
        environment:
            - DATABASE_URL
            - TELEGRAM_BOT_TOKEN
            - JWT_SECRET
        depends_on:
            - postgres

    bot:
        build:
            context: ..
            dockerfile: docker/Dockerfile.bot
        environment:
            - TELEGRAM_BOT_TOKEN
            - API_URL=http://api:3000

    mini-app:
        build:
            context: ..
            dockerfile: docker/Dockerfile.mini-app
        # Static files served by nginx

    admin:
        build:
            context: ..
            dockerfile: docker/Dockerfile.admin
        # Static files served by nginx

    postgres:
        image: postgres:16-alpine
        volumes:
            - postgres_data:/var/lib/postgresql/data
        environment:
            - POSTGRES_DB=fitcalendar
            - POSTGRES_USER
            - POSTGRES_PASSWORD

volumes:
    postgres_data:
```

## 14.2 Nginx Configuration

```nginx
# docker/nginx/nginx.conf
upstream api {
    server api:3000;
}

server {
    listen 443 ssl http2;
    server_name api.fitcalendar.ru;

    ssl_certificate /etc/letsencrypt/live/fitcalendar.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fitcalendar.ru/privkey.pem;

    location / {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl http2;
    server_name app.fitcalendar.ru;

    root /var/www/mini-app;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.fitcalendar.ru;

    root /var/www/admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 14.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
    push:
        branches: [main]

jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4

            - name: Setup pnpm
              uses: pnpm/action-setup@v2

            - name: Install dependencies
              run: pnpm install --frozen-lockfile

            - name: Run tests
              run: pnpm nx affected -t test --base=HEAD~1

            - name: Build
              run: pnpm nx run-many -t build --prod

            - name: Deploy to VPS
              uses: appleboy/ssh-action@v1
              with:
                  host: ${{ secrets.VPS_HOST }}
                  username: ${{ secrets.VPS_USER }}
                  key: ${{ secrets.VPS_SSH_KEY }}
                  script: |
                      cd /opt/fitcalendar
                      git pull
                      docker compose build
                      docker compose up -d
```

---
