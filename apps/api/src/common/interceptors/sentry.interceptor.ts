import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as Sentry from '@sentry/node';
import type { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap({
        error: (exception) => {
          if (process.env.SENTRY_DSN) {
            Sentry.withScope((scope) => {
              const req = context.switchToHttp().getRequest<RequestWithUser>();

              if (req) {
                scope.setExtra('reqId', (req as any).id);
                scope.setExtra('path', req.url);
                scope.setExtra('method', req.method);

                // Attach user context if available (from JwtAuthGuard)
                if (req.user) {
                  scope.setUser({
                    id: req.user.id,
                  });
                }
                
                // If a workspaceId is passed in params, attach it
                if (req.params && req.params.id) {
                  scope.setTag('workspaceId', req.params.id as string);
                } else if (req.params && req.params.workspaceId) {
                  scope.setTag('workspaceId', req.params.workspaceId as string);
                }
              }

              Sentry.captureException(exception);
            });
          }
        },
      }),
    );
  }
}
