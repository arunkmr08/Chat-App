# Deployment Guide

This guide covers deploying the ZoAI Multi-Agent RAG Chat application to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Production Setup](#production-setup)
3. [Deployment Steps](#deployment-steps)
4. [SSL/HTTPS Configuration](#sslhttps-configuration)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required

- **Server**: Linux server (Ubuntu 22.04 LTS recommended) with:
  - Minimum 4GB RAM
  - 20GB+ disk space
  - Docker and Docker Compose installed
  - Git installed

- **Domain**: A domain name pointing to your server's IP address

- **API Keys**:
  - OpenAI API key (required for embeddings)
  - Anthropic API key (optional, for Claude models)
  - Google AI API key (optional, for Gemini models)

### Installing Docker

```bash
# Update package index
sudo apt update

# Install dependencies
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

---

## Production Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/Chat-App.git
cd Chat-App

# Checkout the production branch
git checkout main
```

### 2. Configure Environment Variables

```bash
# Copy the production environment template
cp .env.production.example .env.production

# Edit with your actual values
nano .env.production
```

**Required configuration:**

```bash
# Database passwords (generate strong passwords!)
POSTGRES_PASSWORD=your_strong_password_here
REDIS_PASSWORD=your_strong_redis_password_here

# AI API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...  # Optional
GOOGLE_AI_API_KEY=...         # Optional

# CORS origin (your domain)
CORS_ORIGIN=https://yourdomain.com
```

**Generate strong passwords:**

```bash
# Generate random passwords
openssl rand -base64 32
```

### 3. Build the Web Application

```bash
# Install dependencies
npm install -g pnpm@10
pnpm install

# Build the web app for production
pnpm --filter web build

# The built files will be in apps/web/dist/
```

### 4. Configure the Web App API URL

```bash
# Create production .env for web app
cat > apps/web/.env << EOF
VITE_API_URL=/api
EOF

# Rebuild with production API URL
pnpm --filter web build
```

---

## Deployment Steps

### 1. Start Production Services

```bash
# Load environment variables
export $(cat .env.production | xargs)

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check service status
docker compose -f docker-compose.prod.yml ps
```

**Expected output:**

```
NAME                      STATUS              PORTS
zoai-postgres-prod        Up (healthy)        127.0.0.1:5432->5432/tcp
zoai-redis-prod           Up (healthy)        127.0.0.1:6379->6379/tcp
zoai-api-prod             Up (healthy)        127.0.0.1:3000->3000/tcp
zoai-worker-ingest-prod   Up
zoai-worker-embed-prod    Up
zoai-nginx-prod           Up                  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### 2. Verify Database Initialization

```bash
# Check API logs for database migration
docker compose -f docker-compose.prod.yml logs api | grep -i "migration"

# Should show: "✅ Migrations complete"
```

### 3. Test the API

```bash
# Test health endpoint
curl http://localhost:3000/health

# Should return: {"status":"ok"}

# Test from nginx
curl http://localhost/api/health
```

### 4. Access Your Application

Open your browser and navigate to:

- **Development**: `http://your-server-ip`
- **Production with domain**: `http://yourdomain.com`

---

## SSL/HTTPS Configuration

### Option 1: Let's Encrypt (Free, Recommended)

```bash
# Install Certbot
sudo apt install -y certbot

# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Obtain SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Certificates will be saved to:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Create SSL directory
mkdir -p infra/nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem infra/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem infra/nginx/ssl/key.pem
sudo chown -R $(whoami):$(whoami) infra/nginx/ssl/
```

### Option 2: Custom SSL Certificate

If you have your own SSL certificates:

```bash
# Create SSL directory
mkdir -p infra/nginx/ssl

# Copy your certificates
cp /path/to/your/cert.pem infra/nginx/ssl/cert.pem
cp /path/to/your/key.pem infra/nginx/ssl/key.pem
```

### Enable HTTPS in Nginx

Edit `infra/nginx/conf.d/zoai.conf` and uncomment the HTTPS server block:

```bash
nano infra/nginx/conf.d/zoai.conf

# Uncomment the HTTPS server block (lines starting with # server {)
# Update server_name to your domain
# Save and exit
```

Restart nginx:

```bash
docker compose -f docker-compose.prod.yml restart nginx
```

### Auto-renewal for Let's Encrypt

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e

# Add this line (renews twice daily):
0 0,12 * * * certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /home/user/Chat-App/infra/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /home/user/Chat-App/infra/nginx/ssl/key.pem && docker compose -f /home/user/Chat-App/docker-compose.prod.yml restart nginx"
```

---

## Monitoring & Maintenance

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f worker-ingest
docker compose -f docker-compose.prod.yml logs -f worker-embed

# Nginx logs
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Monitor Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

### Database Backup

```bash
# Create backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U zoai zoai > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
cat backup_20250101_120000.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U zoai zoai
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
pnpm install
pnpm --filter web build
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## Troubleshooting

### Services Not Starting

```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs

# Check specific service
docker compose -f docker-compose.prod.yml logs api

# Restart services
docker compose -f docker-compose.prod.yml restart
```

### Database Connection Errors

```bash
# Check if postgres is healthy
docker compose -f docker-compose.prod.yml ps postgres

# Test connection
docker compose -f docker-compose.prod.yml exec postgres psql -U zoai -d zoai -c "SELECT NOW();"

# Check environment variables
docker compose -f docker-compose.prod.yml exec api env | grep POSTGRES
```

### Worker Not Processing Jobs

```bash
# Check worker logs
docker compose -f docker-compose.prod.yml logs worker-ingest
docker compose -f docker-compose.prod.yml logs worker-embed

# Check Redis connection
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $REDIS_PASSWORD ping

# Restart workers
docker compose -f docker-compose.prod.yml restart worker-ingest worker-embed
```

### API Not Responding

```bash
# Check API health
curl http://localhost:3000/health

# Check API logs
docker compose -f docker-compose.prod.yml logs api

# Restart API
docker compose -f docker-compose.prod.yml restart api
```

### High Memory Usage

```bash
# Check container memory usage
docker stats

# Restart services one by one
docker compose -f docker-compose.prod.yml restart api
docker compose -f docker-compose.prod.yml restart worker-ingest
docker compose -f docker-compose.prod.yml restart worker-embed
```

### Nginx Errors

```bash
# Check nginx configuration syntax
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Check nginx logs
docker compose -f docker-compose.prod.yml logs nginx

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

---

## Security Best Practices

1. **Firewall**: Only expose ports 80 and 443
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **Secrets**: Never commit `.env.production` to Git
   ```bash
   # Verify it's in .gitignore
   grep ".env.production" .gitignore
   ```

3. **Updates**: Keep Docker and system packages updated
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **Backups**: Set up automated daily database backups

5. **Monitoring**: Set up monitoring and alerting (Prometheus, Grafana, etc.)

---

## Performance Tuning

### Scale Workers

```bash
# Edit docker-compose.prod.yml to add more workers
docker compose -f docker-compose.prod.yml up -d --scale worker-ingest=2 --scale worker-embed=2
```

### Increase PostgreSQL Connections

Edit docker-compose.prod.yml:

```yaml
postgres:
  command: postgres -c max_connections=200
```

### Nginx Caching

Add caching to nginx configuration for better performance with static assets.

---

## Support

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/yourusername/Chat-App/issues)
2. Review the [API Guide](./API_GUIDE.md)
3. Check logs for detailed error messages
4. Open a new issue with full error details and logs

---

**Congratulations!** Your ZoAI Multi-Agent RAG Chat application is now deployed to production.
