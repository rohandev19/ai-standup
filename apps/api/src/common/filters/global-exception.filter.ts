import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    if (exception instanceof HttpException) {
      const errResponse = exception.getResponse() as any;
      if (errResponse && errResponse.message) {
        message = errResponse.message;
      }
    }

    // Report unhandled 500+ server errors to Sentry
    if (status >= 500) {
      if (process.env.SENTRY_DSN) {
        Sentry.withScope((scope) => {
          scope.setExtra('path', request.url);
          scope.setExtra('method', request.method);
          if ((request as any).user) {
            scope.setUser({ id: (request as any).user.id });
          }
          Sentry.captureException(exception);
        });
      }
      this.logger.error(
        `[${request.method}] ${request.url} - ${
          exception instanceof Error ? exception.message : 'Unknown Error'
        }`,
        exception instanceof Error ? exception.stack : '',
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${message} (Status: ${status})`,
      );
    }

    response.status(status).json({
      statusCode: status,
      message: message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request as any).id, // Inject requestId from middleware
    });
  }
}
