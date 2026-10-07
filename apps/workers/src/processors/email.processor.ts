import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeadLetterService } from '../common/dead-letter.service';

@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  constructor(
    private readonly config: ConfigService,
    private readonly deadLetters: DeadLetterService,
  ) { super(); }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error) {
    if (!job) return;
    await this.deadLetters.capture('email-queue', job, error);
  }

  async process(job: Job) {
    const { to, subject, template, vars, html, text } = job.data as {
      to: string;
      subject: string;
      template?: string;
      vars?: Record<string, unknown>;
      html?: string;
      text?: string;
    };
    const provider = this.config.get<string>('EMAIL_PROVIDER', 'console').toLowerCase();
    const production = this.config.get<string>('NODE_ENV') === 'production';
    const from = this.config.get<string>('EMAIL_FROM', 'no-reply@lookiva.app');

    if (provider === 'console') {
      if (production) throw new Error('EMAIL_PROVIDER=console is forbidden in production');
      this.logger.log(`[DEV-EMAIL] ${from} -> ${to}; ${subject}; template=${template ?? 'raw'}`);
      return { delivered: false, provider: 'console' };
    }
    if (provider !== 'generic_http') throw new Error(`Unsupported EMAIL_PROVIDER=${provider}`);

    const endpoint = this.config.get<string>('EMAIL_PROVIDER_BASE_URL');
    const apiKey = this.config.get<string>('EMAIL_API_KEY');
    if (!endpoint || !apiKey) throw new Error('Email provider configuration is incomplete');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to, subject, template, vars: vars ?? {}, html, text }),
    });
    if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`);
    return { delivered: true, provider };
  }
}
