type StatusBucket = '2xx' | '3xx' | '4xx' | '5xx' | 'other';

type Snapshot = {
  startedAt: string;
  uptimeSeconds: number;
  requestsTotal: number;
  errorsTotal: number;
  averageDurationMs: number;
  p95DurationMs: number;
  byMethod: Record<string, number>;
  byStatus: Record<StatusBucket, number>;
};

const startedAt = new Date();
let requestsTotal = 0;
let errorsTotal = 0;
let durationTotalMs = 0;
const recentDurations: number[] = [];
const byMethod: Record<string, number> = {};
const byStatus: Record<StatusBucket, number> = {
  '2xx': 0,
  '3xx': 0,
  '4xx': 0,
  '5xx': 0,
  other: 0,
};

function statusBucket(statusCode: number): StatusBucket {
  if (statusCode >= 200 && statusCode < 300) return '2xx';
  if (statusCode >= 300 && statusCode < 400) return '3xx';
  if (statusCode >= 400 && statusCode < 500) return '4xx';
  if (statusCode >= 500 && statusCode < 600) return '5xx';
  return 'other';
}

export function observeRequest(
  method: string,
  statusCode: number,
  durationMs: number,
) {
  requestsTotal += 1;
  if (statusCode >= 500) errorsTotal += 1;
  durationTotalMs += durationMs;

  const normalizedMethod = method.toUpperCase();
  byMethod[normalizedMethod] = (byMethod[normalizedMethod] ?? 0) + 1;
  byStatus[statusBucket(statusCode)] += 1;

  recentDurations.push(durationMs);
  if (recentDurations.length > 1000) recentDurations.shift();
}

export function requestMetricsSnapshot(): Snapshot {
  const sorted = [...recentDurations].sort((a, b) => a - b);
  const p95Index = sorted.length
    ? Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
    : 0;
  return {
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.max(
      0,
      Math.round((Date.now() - startedAt.getTime()) / 1000),
    ),
    requestsTotal,
    errorsTotal,
    averageDurationMs:
      requestsTotal > 0
        ? Number((durationTotalMs / requestsTotal).toFixed(2))
        : 0,
    p95DurationMs: sorted.length
      ? Number(sorted[p95Index].toFixed(2))
      : 0,
    byMethod: { ...byMethod },
    byStatus: { ...byStatus },
  };
}
