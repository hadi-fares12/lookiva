import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';

@Injectable()
export class DeadLetterService {
  private readonly logger = new Logger(DeadLetterService.name);

  constructor(
    @InjectQueue('dead-letter-queue')
    private readonly deadLetterQueue: Queue,
  ) {}

  async capture(queueName: string, job: Job, error: Error) {
    const maxAttempts = Math.max(1, Number(job.opts.attempts ?? 1));
    if (job.attemptsMade < maxAttempts) return;

    const originalJobId = job.id == null ? 'unknown' : String(job.id);
    const deadLetterId = `${queueName}:${originalJobId}`;

    await this.deadLetterQueue.add(
      'terminal-failure',
      {
        queueName,
        originalJobId,
        jobName: job.name,
        data: job.data,
        attemptsMade: job.attemptsMade,
        maxAttempts,
        failedAt: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack?.slice(0, 12_000) ?? null,
        },
      },
      {
        jobId: deadLetterId,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    this.logger.error(
      `Dead-lettered ${queueName}/${originalJobId} after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
