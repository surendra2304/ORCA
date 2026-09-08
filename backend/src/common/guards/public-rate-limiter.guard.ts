import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class PublicRateLimiterGuard implements CanActivate {
  private cache = new Map<string, { count: number; resetTime: number }>();
  private readonly LIMIT = 60; // 60 requests
  private readonly WINDOW_MS = 60000; // 1 minute window

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const url = request.url || '';

    // Only apply rate limiting to public endpoints
    if (!url.includes('/public/')) {
      return true;
    }

    const ip = (request.headers['x-forwarded-for'] as string) || request.ip || request.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    const record = this.cache.get(ip);

    if (!record || now > record.resetTime) {
      this.cache.set(ip, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return true;
    }

    if (record.count >= this.LIMIT) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again in a minute.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }
}
