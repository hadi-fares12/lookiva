import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import sharp from 'sharp';
import { PrismaService } from '../common/prisma.service';
import { DeadLetterService } from '../common/dead-letter.service';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';

const execFileAsync = promisify(execFile);

type Variant = {
  variant: string;
  storageKey: string;
  mimeType: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  url?: string;
};

@Processor('media-process-queue')
export class MediaProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaProcessor.name);
  private readonly minio: Minio.Client;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly deadLetters: DeadLetterService,
  ) {
    super();
    this.minio = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.config.get<number>('MINIO_PORT', 9000),
      useSSL: this.config.get<boolean>('MINIO_USE_SSL', false),
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'lookiva_admin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'lookiva_minio_dev'),
    });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error) {
    if (!job) return;
    await this.deadLetters.capture('media-process-queue', job, error);
  }

  async process(job: Job) {
    const { mediaId } = job.data as { mediaId: string };
    if (!mediaId) throw new Error('mediaId is required');

    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new Error(`Media ${mediaId} not found`);

    await this.prisma.media.update({ where: { id: mediaId }, data: { status: 'processing' } });

    try {
      const input = await this.readObject(media.storage_bucket, media.storage_key);
      let variants: Variant[];

      if (media.mime_type.startsWith('image/')) {
        variants = await this.processImage(media.storage_bucket, media.storage_key, input, media.is_public);
      } else if (media.mime_type.startsWith('video/')) {
        variants = await this.processVideo(media.storage_bucket, media.storage_key, input, media.is_public);
      } else {
        throw new Error(`Unsupported media type ${media.mime_type}`);
      }

      const originalMeta = media.mime_type.startsWith('image/') ? await sharp(input).metadata() : null;
      await this.prisma.media.update({
        where: { id: mediaId },
        data: {
          variants: variants as any,
          status: 'processed',
          processed_at: new Date(),
          width_pixels: originalMeta?.width ?? media.width_pixels,
          height_pixels: originalMeta?.height ?? media.height_pixels,
          checksum_sha256: crypto.createHash('sha256').update(input).digest('hex'),
        },
      });

      this.logger.log(`Processed media ${mediaId}: ${variants.map((v) => v.variant).join(', ')}`);
      return { mediaId, variants };
    } catch (error) {
      await this.prisma.media.update({ where: { id: mediaId }, data: { status: 'failed' } }).catch(() => undefined);
      throw error;
    }
  }

  private async readObject(bucket: string, key: string): Promise<Buffer> {
    const stream = await this.minio.getObject(bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  private publicUrl(bucket: string, key: string, isPublic: boolean): string | undefined {
    if (!isPublic) return undefined;
    const base = this.config.get<string>('MEDIA_PUBLIC_BASE_URL')?.replace(/\/$/, '');
    return base ? `${base}/${bucket}/${key}` : undefined;
  }

  private async putVariant(bucket: string, key: string, body: Buffer, mimeType: string): Promise<void> {
    await this.minio.putObject(bucket, key, body, body.length, { 'Content-Type': mimeType });
  }

  private async processImage(bucket: string, originalKey: string, input: Buffer, isPublic: boolean): Promise<Variant[]> {
    const specs = [
      { variant: 'thumb', width: 200, height: 200, fit: 'cover' as const },
      { variant: 'small', width: 640, fit: 'inside' as const },
      { variant: 'medium', width: 1280, fit: 'inside' as const },
      { variant: 'large', width: 1920, fit: 'inside' as const },
    ];
    const variants: Variant[] = [];

    for (const spec of specs) {
      const transformer = sharp(input).rotate().resize({
        width: spec.width,
        height: spec.height,
        fit: spec.fit,
        withoutEnlargement: spec.variant !== 'thumb',
      }).webp({ quality: spec.variant === 'thumb' ? 82 : 86 });
      const { data, info } = await transformer.toBuffer({ resolveWithObject: true });
      const key = `${spec.variant}/${path.parse(originalKey).name}.webp`;
      await this.putVariant(bucket, key, data, 'image/webp');
      variants.push({
        variant: spec.variant,
        storageKey: key,
        mimeType: 'image/webp',
        width: info.width,
        height: info.height,
        sizeBytes: data.length,
        url: this.publicUrl(bucket, key, isPublic),
      });
    }
    return variants;
  }

  private async processVideo(bucket: string, originalKey: string, input: Buffer, isPublic: boolean): Promise<Variant[]> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lookiva-media-'));
    const inputPath = path.join(tempDir, `input${path.extname(originalKey) || '.mp4'}`);
    await fs.writeFile(inputPath, input);
    const variants: Variant[] = [];

    try {
      const thumbPath = path.join(tempDir, 'thumb.jpg');
      await execFileAsync('ffmpeg', ['-y', '-ss', '00:00:01', '-i', inputPath, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '3', thumbPath], { maxBuffer: 10 * 1024 * 1024 });
      const thumb = await fs.readFile(thumbPath);
      const thumbKey = `thumb/${path.parse(originalKey).name}.jpg`;
      await this.putVariant(bucket, thumbKey, thumb, 'image/jpeg');
      const thumbMeta = await sharp(thumb).metadata();
      variants.push({ variant: 'thumb', storageKey: thumbKey, mimeType: 'image/jpeg', width: thumbMeta.width, height: thumbMeta.height, sizeBytes: thumb.length, url: this.publicUrl(bucket, thumbKey, isPublic) });

      const encodes = [
        { variant: 'small', height: 480, crf: '28' },
        { variant: 'medium', height: 720, crf: '25' },
        { variant: 'large', height: 1080, crf: '23' },
      ];
      for (const encode of encodes) {
        const outPath = path.join(tempDir, `${encode.variant}.mp4`);
        await execFileAsync('ffmpeg', [
          '-y', '-i', inputPath,
          '-vf', `scale=-2:min(${encode.height}\\,ih)`,
          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', encode.crf,
          '-c:a', 'aac', '-b:a', '128k',
          '-movflags', '+faststart',
          outPath,
        ], { maxBuffer: 20 * 1024 * 1024 });
        const data = await fs.readFile(outPath);
        const key = `${encode.variant}/${path.parse(originalKey).name}.mp4`;
        await this.putVariant(bucket, key, data, 'video/mp4');
        variants.push({ variant: encode.variant, storageKey: key, mimeType: 'video/mp4', height: encode.height, sizeBytes: data.length, url: this.publicUrl(bucket, key, isPublic) });
      }
      return variants;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
