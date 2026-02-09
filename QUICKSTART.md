# Quick Start - Production Deployment

## Prerequisites
- Node.js 20+
- PostgreSQL database OR Docker

## Option 1: Docker (Easiest) 🐳

```bash
# 1. Clone and navigate to project
cd TeamFlow-SaaS

# 2. Create .env file
cp .env.example .env

# 3. Edit .env and update these values:
#    - SESSION_SECRET (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
#    - POSTGRES_PASSWORD (secure password)
#    - NODE_ENV=production

# 4. Build and start
npm run docker:build
npm run docker:up

# 5. View logs
npm run docker:logs

# Your app is now running at http://localhost:5000
```

## Option 2: Traditional Deployment 🚀

```bash
# 1. Install dependencies
npm ci

# 2. Create .env file
cp .env.example .env

# 3. Edit .env with your values:
#    - DATABASE_URL=postgresql://user:pass@host:5432/dbname
#    - SESSION_SECRET (32+ chars)
#    - NODE_ENV=production

# 4. Run database migrations
npm run db:push

# 5. Build the application
npm run build

# 6. Start the server
npm start

# Your app is running at http://localhost:5000
```

## Option 3: PM2 (Recommended for Production) ⚡

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Follow Option 2 steps 1-4

# 3. Start with PM2
pm2 start ecosystem.config.cjs

# 4. Save PM2 configuration
pm2 save

# 5. Setup PM2 startup script (auto-restart on reboot)
pm2 startup

# View logs
pm2 logs

# Monitor
pm2 monit
```

## Health Checks

Verify your deployment:

```bash
# Basic health
curl http://localhost:5000/health

# Database readiness
curl http://localhost:5000/ready

# Liveness probe
curl http://localhost:5000/live
```

## Default Credentials

**Demo Account:**
- Username: `admin`
- Password: `password123`

**Or create a new account** at `/auth/login`

## Environment Variables (Required)

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/database
SESSION_SECRET=<32+ character random string>
PORT=5000
LOG_LEVEL=info
ALLOWED_ORIGINS=https://yourdomain.com
```

Generate SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## HTTPS Setup (Production)

### Using Nginx + Let's Encrypt

```bash
# 1. Install Nginx
sudo apt install nginx certbot python3-certbot-nginx

# 2. Create Nginx config (/etc/nginx/sites-available/teamflow)
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 3. Enable site
sudo ln -s /etc/nginx/sites-available/teamflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 4. Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

## Troubleshooting

### Server won't start
```bash
# Check logs
tail -f logs/error.log

# Or with PM2
pm2 logs

# Or with Docker
npm run docker:logs
```

### Database connection failed
- Verify DATABASE_URL is correct
- Check PostgreSQL is running: `pg_isready`
- Check firewall allows connection

### Session issues
- Ensure SESSION_SECRET is set and 32+ characters
- Check `user_sessions` table was created in database

### Rate limiting too strict
Edit `server/middleware/security.ts`:
- Increase `max` value for more requests
- Increase `windowMs` for longer time window

## Monitoring

### Logs
```bash
# Development (console)
npm run dev

# Production (files)
tail -f logs/combined.log
tail -f logs/error.log

# PM2
pm2 logs teamflow-saas

# Docker
docker-compose logs -f
```

### PM2 Monitoring
```bash
pm2 monit           # Real-time monitoring
pm2 status          # Status overview
pm2 describe app-name  # Detailed info
```

## Backup Database

### Manual Backup
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Restore
```bash
psql $DATABASE_URL < backup_20260207.sql
```

## Security Checklist

Before going live:
- [ ] Change SESSION_SECRET to secure random string
- [ ] Use HTTPS (not HTTP)
- [ ] Set strong database password
- [ ] Configure firewall (ports 80, 443, 22 only)
- [ ] Set ALLOWED_ORIGINS to your domain
- [ ] Enable automatic security updates
- [ ] Set up database backups
- [ ] Test health check endpoints
- [ ] Review application logs

## Support

- **Documentation**: See `DEPLOYMENT.md` for detailed guide
- **Features**: See `PRODUCTION_FEATURES.md` for all features
- **Health Checks**: http://localhost:5000/health

## Next Steps

1. Set up monitoring (UptimeRobot, Pingdom)
2. Configure email notifications (SendGrid, AWS SES)
3. Implement Stripe payments (if needed)
4. Add file upload (AWS S3, Cloudinary)
5. Set up CI/CD pipeline

---

**🎉 Your production-ready TeamFlow SaaS is now running!**
