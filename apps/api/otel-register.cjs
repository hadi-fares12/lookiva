'use strict';

const endpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
  '';

const disabled =
  String(process.env.OTEL_SDK_DISABLED || '').toLowerCase() === 'true';

if (!disabled && endpoint.trim()) {
  process.env.OTEL_SERVICE_NAME =
    process.env.OTEL_SERVICE_NAME || 'lookiva-api';
  process.env.OTEL_TRACES_EXPORTER =
    process.env.OTEL_TRACES_EXPORTER || 'otlp';
  process.env.OTEL_METRICS_EXPORTER =
    process.env.OTEL_METRICS_EXPORTER || 'otlp';
  process.env.OTEL_LOGS_EXPORTER =
    process.env.OTEL_LOGS_EXPORTER || 'none';
  process.env.OTEL_PROPAGATORS =
    process.env.OTEL_PROPAGATORS || 'tracecontext,baggage';

  require('@opentelemetry/auto-instrumentations-node/register');
}
