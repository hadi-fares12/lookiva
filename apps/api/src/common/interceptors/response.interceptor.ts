import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  cursor?: string;
}

export interface ResponseFormat<T> {
  data: T;
  meta?: ResponseMeta;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ResponseFormat<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T>> {
    return next.handle().pipe(
      map((value) => {
        if (
          value &&
          typeof value === 'object' &&
          'data' in value &&
          ('meta' in value || Object.keys(value).length <= 2)
        ) {
          return value as ResponseFormat<T>;
        }
        return { data: value };
      }),
    );
  }
}
