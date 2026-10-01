import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const method = request.method;
    const url = request.url;

    let correlationId = request.headers?.['x-correlation-id'] as
      | string
      | undefined;
    if (!correlationId) {
      correlationId = uuidv4();
      request.headers['x-correlation-id'] = correlationId;
    }

    if (!response.getHeader('x-correlation-id')) {
      response.setHeader('x-correlation-id', correlationId);
    }

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const status = response.statusCode;
          this.logger.log(
            `[${correlationId}] ${method} ${url} ${status} ${duration}ms`,
          );
        },
        error: () => {
          const duration = Date.now() - start;
          const status = response.statusCode || 500;
          this.logger.error(
            `[${correlationId}] ${method} ${url} ${status} ${duration}ms`,
          );
        },
      }),
    );
  }
}
