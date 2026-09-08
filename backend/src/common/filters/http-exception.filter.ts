import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const resObj = isHttp ? exception.getResponse() : null;
    const isObj = typeof resObj === 'object' && resObj !== null;

    let message = isObj ? (resObj as any).message || exception.message : (exception instanceof Error ? exception.message : 'Internal server error');
    message = Array.isArray(message) ? message.join(', ') : message;
    
    let code = isObj ? (resObj as any).error || 'BAD_REQUEST' : (exception instanceof Error ? exception.name || 'ERROR' : 'INTERNAL_SERVER_ERROR');

    if (status >= 500 && process.env.NODE_ENV === 'production') message = 'Internal server error';

    const logMsg = `[${request.method}] ${request.url} - Status: ${status}`;
    if (status >= 500) this.logger.error(`${logMsg} - Error: ${exception instanceof Error ? exception.stack : JSON.stringify(exception)}`);
    else this.logger.warn(`${logMsg} - Message: ${message}`);

    response.status(status).json({ error: { code, message } });
  }
}
