import compression from 'compression';
import type { Express, Request, Response, NextFunction } from 'express';
import logger from '../logger';

// Response compression middleware
export function setupCompression(app: Express) {
  app.use(
    compression({
      // Compress all responses
      filter: (req: Request, res: Response) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      // Compression level (0-9, higher = more compression but slower)
      level: 6,
      // Minimum size to compress (in bytes)
      threshold: 1024, // 1KB
    })
  );

  logger.info('Response compression enabled');
}

// Request metrics middleware
const requestMetrics = {
  totalRequests: 0,
  totalResponseTime: 0,
  slowRequests: [] as Array<{ path: string; duration: number; timestamp: number }>,
};

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    requestMetrics.totalRequests++;
    requestMetrics.totalResponseTime += duration;

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      requestMetrics.slowRequests.push({
        path: req.path,
        duration,
        timestamp: Date.now(),
      });

      // Keep only last 100 slow requests
      if (requestMetrics.slowRequests.length > 100) {
        requestMetrics.slowRequests.shift();
      }

      logger.warn('Slow request detected', {
        path: req.path,
        method: req.method,
        duration: `${duration}ms`,
      });
    }
  });

  next();
}

export function getMetrics() {
  const avgResponseTime =
    requestMetrics.totalRequests > 0
      ? requestMetrics.totalResponseTime / requestMetrics.totalRequests
      : 0;

  return {
    totalRequests: requestMetrics.totalRequests,
    averageResponseTime: Math.round(avgResponseTime),
    slowRequests: requestMetrics.slowRequests.slice(-10), // Last 10 slow requests
  };
}
