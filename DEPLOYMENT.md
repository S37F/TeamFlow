# Production Deployment Guide

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database (or use Docker Compose)
- Domain name (for HTTPS)
- SSL certificate (Let's Encrypt recommended)

## Environment Variables

Create a `.env` file with production values:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@your-db-host:5432/teamflow
SESSION_SECRET=<generate-a-secure-random-string-32-chars-minimum>
PORT=5000
LOG_LEVEL=info
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Generating SESSION_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

1. **Build the Docker image:**
```bash
npm run docker:build
```

2. **Start services:**
```bash
npm run docker:up
```

3. **View logs:**
```bash
npm run docker:logs
```

4. **Stop services:**
```bash
npm run docker:down
```

### Option 2: Traditional Node.js Deployment

1. **Install dependencies:**
```bash
npm ci --production=false
```

2. **Generate and run database migrations:**
```bash
npm run db:generate
npm run db:migrate
```

3. **Build the application:**
```bash
npm run build
```

4. **Start the server:**
```bash
npm start
```

### Option 3: PM2 Process Manager

1. **Install PM2 globally:**
```bash
npm install -g pm2
```

2. **Create `ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [{
    name: 'teamflow-saas',
    script: './dist/index.cjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
  }],
};
```

3. **Start with PM2:**
```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Nginx Reverse Proxy Setup

Create `/etc/nginx/sites-available/teamflow`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/teamflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Database Backups

### Automated Daily Backups

Create a backup script `/opt/teamflow/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/teamflow/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="teamflow"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DATABASE_URL > $BACKUP_DIR/teamflow_$TIMESTAMP.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "teamflow_*.sql" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /opt/teamflow/backup.sh
```

## Monitoring

### Health Checks

- Liveness: `http://yourdomain.com/live`
- Readiness: `http://yourdomain.com/ready`
- Health: `http://yourdomain.com/health`

### Log Files

Logs are written to:
- `logs/error.log` - Error level logs
- `logs/combined.log` - All logs

### Viewing Logs

```bash
# Real-time logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# With PM2
pm2 logs teamflow-saas
```

## Security Checklist

- [ ] Change SESSION_SECRET to a secure random string (32+ characters)
- [ ] Use HTTPS in production (secure cookies enabled automatically)
- [ ] Set strong PostgreSQL password
- [ ] Configure firewall (allow only 80, 443, 22)
- [ ] Enable automatic security updates
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Review and restrict ALLOWED_ORIGINS
- [ ] Enable rate limiting (already configured)
- [ ] Set up monitoring and alerts
- [ ] Regular dependency updates (`npm audit`)

## Performance Optimization

### Node.js

```bash
# Set Node.js options for production
NODE_OPTIONS="--max-old-space-size=2048"
```

### Database Indexes

Already configured in schema, but verify:
```sql
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
```

## Troubleshooting

### Check Application Status
```bash
# With PM2
pm2 status

# With Docker
docker ps
docker-compose ps
```

### View Logs
```bash
# Application logs
cat logs/combined.log

# Docker logs
docker-compose logs -f

# PM2 logs
pm2 logs
```

### Restart Application
```bash
# PM2
pm2 restart teamflow-saas

# Docker
docker-compose restart app

# Systemd
sudo systemctl restart teamflow
```

### Database Connection Issues
1. Verify DATABASE_URL is correct
2. Check PostgreSQL is running
3. Verify firewall allows connection
4. Check database credentials

## Scaling

### Horizontal Scaling (PM2 Cluster Mode)

Already configured in PM2 ecosystem.config.js with `instances: 'max'`

### Load Balancing

Use Nginx upstream for multiple instances:

```nginx
upstream teamflow_backend {
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
    server 127.0.0.1:5003;
}

server {
    location / {
        proxy_pass http://teamflow_backend;
    }
}
```

## Support

For issues:
1. Check logs: `logs/error.log`
2. Verify environment variables
3. Check database connection
4. Review health endpoints
