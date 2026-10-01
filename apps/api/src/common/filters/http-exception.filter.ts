import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { v4 as uuidv4 } from 'uuid';

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  code?: string;
  correlationId: string;
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(
    @Inject(I18nService)
    private readonly i18n: I18nService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx: HttpArgumentsHost = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const correlationId =
      (request.headers?.['x-correlation-id'] as string) || uuidv4();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorName =
      exception instanceof HttpException
        ? exception.name
        : 'InternalServerErrorException';

    let message: string | string[] = 'Internal server error';
    let code: string | undefined;
    let details: unknown;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r.message as string | string[]) || exception.message;
        code = r.code as string | undefined;
        details = r.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `[${correlationId}] Unhandled exception: ${exception.stack}`,
      );
    }

    const i18n = I18nContext.current();
    const lang = i18n?.lang || 'en';

    const translatedMessage = this.translateMessage(message, lang);

    const errorResponse: ErrorResponse = {
      statusCode: status,
      error: errorName,
      message: translatedMessage,
      code,
      correlationId,
      details,
    };

    response.status(status).json(errorResponse);
  }

  private translateMessage(
    message: string | string[],
    lang: string,
  ): string | string[] {
    if (Array.isArray(message)) {
      return message.map((m) => this.translateSingle(m, lang));
    }
    return this.translateSingle(message, lang);
  }

  private translateSingle(msg: string, lang: string): string {
    try {
      const translated = this.i18n.t(`errors.${msg}`, {
        lang,
        defaultValue: msg,
      });
      return translated;
    } catch {
      return msg;
    }
  }
}
