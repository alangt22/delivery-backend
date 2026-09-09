import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    let message = 'Erro interno do servidor';
    let code: string | undefined;
    let items: unknown[] | undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const publicResponse = exceptionResponse as {
        message?: string | string[];
        code?: string;
        items?: unknown[];
      };

      if (publicResponse.message) {
        message = Array.isArray(publicResponse.message)
          ? publicResponse.message.join(', ')
          : publicResponse.message;
      }

      code = publicResponse.code;
      items = publicResponse.items;
    }

    // Erros 5xx devem ser registrados internamente,
    // mas detalhes internos não devem ser enviados ao cliente.
    if (status >= 500) {
      this.logger.error(
        `Erro interno: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      );

      message = 'Erro interno do servidor';
    }

    const body: {
      statusCode: number;
      message: string;
      timestamp: string;
      path: string;
      code?: string;
      items?: unknown[];
    } = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (code !== undefined) {
      body.code = code;
    }

    if (items !== undefined) {
      body.items = items;
    }

    response.status(status).json(body);
  }
}