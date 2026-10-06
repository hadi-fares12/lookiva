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
import { Prisma } from '@prisma/client';

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

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorName =
      exception instanceof HttpException
        ? exception.name
        : 'InternalServerErrorException';

    let message: string | string[] = 'Internal server error';
    let code: string | undefined;
    let details: unknown;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      code = exception.code;
      details = exception.meta;

      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          errorName = 'ConflictException';
          message = 'A record with the same unique value already exists';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          errorName = 'NotFoundException';
          message = 'Requested record was not found';
          break;
        case 'P2003':
          status = HttpStatus.CONFLICT;
          errorName = 'ConflictException';
          message = 'This operation conflicts with related records';
          break;
        case 'P2034':
          status = HttpStatus.CONFLICT;
          errorName = 'ConflictException';
          message = 'The operation conflicted with another transaction. Please retry.';
          break;
        case 'P2000':
        case 'P2005':
        case 'P2006':
        case 'P2007':
        case 'P2011':
        case 'P2012':
        case 'P2013':
        case 'P2014':
        case 'P2019':
        case 'P2023':
          status = HttpStatus.BAD_REQUEST;
          errorName = 'BadRequestException';
          message = 'The request contains invalid data';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          errorName = 'DatabaseException';
          message = 'Database operation failed';
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorName = 'BadRequestException';
      message = 'The request contains invalid database input';
      code = 'PRISMA_VALIDATION';
    }

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
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError ||
      exception instanceof Prisma.PrismaClientValidationError
    ) {
      this.logger.warn(
        `[${correlationId}] Prisma request error: ${exception.message}`,
      );
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${correlationId}] Unhandled exception: ${exception.stack}`,
      );
      message = 'Internal server error';
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
