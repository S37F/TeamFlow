# Production Features Documentation

## 🚀 Overview

This document describes the production-ready features implemented in TeamFlow SaaS.

## ✅ Implemented Features

### 1. **Payment Integration (Stripe)**

Complete Stripe integration for subscription management.

#### Features:
- ✅ Checkout session creation for Pro/Enterprise plans
- ✅ Customer portal for subscription management
- ✅ Webhook handling for subscription events
- ✅ Automatic tier upgrades/downgrades
- ✅ Email confirmations for payments

#### Configuration:

Add to `.env`:
```bash
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
```

#### API Endpoints:

- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Create customer portal session
- `POST /api/stripe/webhook` - Stripe webhook handler
- `GET /api/stripe/subscription` - Get current subscription info

#### Usage:

```typescript
// Client-side: Create checkout session
const response = await fetch('/api/stripe/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tier: 'pro' }),
});
const { url } = await response.json();
window.location.href = url;
```

### 2. **Email System**

Nodemailer-based email service with beautiful HTML templates.

#### Features:
- ✅ Welcome emails for new users
- ✅ Subscription confirmation emails
- ✅ Task assignment notifications
- ✅ Password reset emails
- ✅ Responsive HTML templates

#### Configuration:

Add to `.env`:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="TeamFlow <noreply@teamflow.com>"
```

#### Usage:

```typescript
import { emailService } from './services/email';

// Send welcome email
await emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe',
  'Acme Corp'
);

// Send subscription confirmation
await emailService.sendSubscriptionConfirmation(
  'user@example.com',
  'Professional',
  29
);
```

### 3. **Backup System**

Automated PostgreSQL backup and restore scripts.

#### Features:
- ✅ Timestamped backups
- ✅ Automatic compression (gzip)
- ✅ Retention policy (default: 7 days)
- ✅ Easy restoration
- ✅ Windows PowerShell scripts

#### Usage:

```bash
# Create backup
npm run db:backup

# Create backup in custom directory
npm run db:backup -- -BackupDir "D:\backups"

# Restore from backup
npm run db:restore -- -BackupFile ".\backups\teamflow_backup_20260207_123456.sql.gz"

# Force restore without confirmation
npm run db:restore -- -BackupFile ".\backups\backup.sql" -Force
```

#### Scheduled Backups:

Use Windows Task Scheduler:
```powershell
# Create daily backup task
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$action = New-ScheduledTaskAction -Execute "npm" -Argument "run db:backup" -WorkingDirectory "C:\path\to\TeamFlow-SaaS"
Register-ScheduledTask -TaskName "TeamFlow Daily Backup" -Trigger $trigger -Action $action
```

### 4. **Performance Optimization**

Multiple layers of performance improvements.

#### Features:
- ✅ Response compression (gzip/brotli)
- ✅ Database query optimization with indexes
- ✅ Connection pooling (PostgreSQL)
- ✅ Request metrics tracking
- ✅ Slow query detection
- ✅ Response caching middleware

#### Database Indexes:

Run optimization script:
```bash
npm run db:optimize
```

This creates indexes on:
- `users.username`
- `users.organization_id`
- `tasks.project_id`
- `tasks.status`
- `tasks.assignee_id`
- And more...

#### Performance Metrics API:

```bash
GET /api/metrics
```

Returns:
```json
{
  "totalRequests": 12543,
  "averageResponseTime": 45,
  "slowRequests": [
    {
      "path": "/api/tasks/list",
      "duration": 1250,
      "timestamp": 1234567890
    }
  ]
}
```

#### Compression:

Automatically compresses all responses > 1KB. Supports:
- gzip
- deflate
- brotli (if available)

### 5. **Health Checks**

Comprehensive health monitoring endpoints (already implemented).

#### Endpoints:

- `GET /health` - Basic health check
- `GET /ready` - Readiness check with DB connection test
- `GET /live` - Liveness check

#### Example Response:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-07T12:00:00.000Z",
  "uptime": 3600.5,
  "environment": "production",
  "database": "connected"
}
```

---

## 📊 Monitoring

### Application Logs

Logs are stored in:
- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs

### Metrics Endpoint

Only accessible to organization owners:
```bash
GET /api/metrics
```

### Health Monitoring

Use health check endpoints for:
- Load balancer health checks
- Kubernetes liveness/readiness probes
- Uptime monitoring services

---

## 🔒 Security Features

All implemented in `server/middleware/security.ts`:

- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Rate limiting (API & Auth)
- ✅ Secure session cookies
- ✅ CSRF protection
- ✅ XSS protection

---

## 🚢 Deployment

### Environment Variables

Required for production:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=your-32-char-secret
PORT=5000

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM="TeamFlow <noreply@teamflow.com>"

# App
APP_URL=https://your-domain.com
```

### Docker Deployment

```bash
# Build and start
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs

# Stop
npm run docker:down
```

### PM2 Deployment

```bash
# Start with PM2
pm2 start ecosystem.config.cjs

# Monitor
pm2 monit

# Logs
pm2 logs teamflow

# Restart
pm2 restart teamflow
```

---

## 📈 Subscription Tiers

### Free Tier
- Up to 3 projects
- Up to 5 team members
- Basic task management
- $0/month

### Professional Tier
- Unlimited projects
- Up to 20 team members
- Advanced analytics
- Priority support
- $29/month

### Enterprise Tier
- Unlimited everything
- Custom integrations
- Dedicated support
- SLA guarantee
- $99/month

---

## 🛠️ Maintenance

### Daily Tasks
- Monitor logs: `tail -f logs/error.log`
- Check health: `curl http://localhost:5000/health`
- Review metrics: `GET /api/metrics`

### Weekly Tasks
- Review slow queries in metrics
- Check disk space for backups
- Update dependencies: `npm audit fix`

### Monthly Tasks
- Review subscription usage
- Optimize database: `npm run db:optimize`
- Test backup restoration

---

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Nodemailer Guide](https://nodemailer.com/)
- [PostgreSQL Backup Docs](https://www.postgresql.org/docs/current/backup.html)
- [Express Performance Tips](https://expressjs.com/en/advanced/best-practice-performance.html)

---

## 🐛 Troubleshooting

### Stripe Webhook Not Working
1. Check webhook secret matches Stripe dashboard
2. Verify endpoint is publicly accessible
3. Test with Stripe CLI: `stripe listen --forward-to localhost:5000/api/stripe/webhook`

### Email Not Sending
1. Check SMTP credentials
2. Enable "Less secure app access" for Gmail
3. Use app-specific password for Gmail
4. Check firewall/port 587 is open

### Backup Fails
1. Ensure `pg_dump` is in PATH
2. Check PostgreSQL client tools are installed
3. Verify DATABASE_URL is correct
4. Check disk space

### Performance Issues
1. Run `npm run db:optimize` to add indexes
2. Check slow queries in `/api/metrics`
3. Monitor memory usage
4. Review database connection pool size

---

*Last updated: February 7, 2026*
