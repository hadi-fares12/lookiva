import {
  Injectable,
  Logger,
  UnprocessableEntityException,
  Optional,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as Minio from 'minio';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_MIMES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'video/mp4',
];

const ALLOWED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.mp4',
];

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

type MediaRecord = {
  id: string;
  uploader_user_id: string;
  storage_key: string;
  original_file_name: string;
  stored_file_name: string;
  storage_bucket: string;
  storage_provider: string;
  mime_category: string;
  mime_type: string;
  size_bytes: number;
  width_pixels: number | null;
  height_pixels: number | null;
  is_public: boolean;
  status: string;
  created_at: Date;
};

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private minioClient: Minio.Client | null = null;
  private fallbackDir: string;
  private minioAvailable = false;

  private get isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Optional()
    @InjectQueue('media-process-queue')
    private readonly mediaProcessQueue?: Queue,
  ) {
    this.fallbackDir = path.join(process.cwd(), 'tmp', 'media');
  }

  async onModuleInit() {
    this.initMinioClient();
    await this.ensureBuckets();
  }

  private initMinioClient() {
    try {
      const endPoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
      const port = this.configService.get<number>('MINIO_PORT', 9000);
      const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'lookiva_admin');
      const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'lookiva_minio_dev');

      this.minioClient = new Minio.Client({
        endPoint,
        port,
        useSSL: this.configService.get<boolean>('MINIO_USE_SSL', false),
        accessKey,
        secretKey,
      });
      this.minioAvailable = true;
    } catch (e: any) {
      this.minioAvailable = false;
      if (this.isProduction) {
        throw new ServiceUnavailableException(`Object storage initialization failed: ${e.message}`);
      }
      this.logger.warn(`MinIO client initialization failed, falling back to local fs: ${e.message}`);
      this.ensureFallbackDir();
    }
  }

  private ensureFallbackDir() {
    try {
      fs.mkdirSync(path.join(this.fallbackDir, 'media'), { recursive: true });
      fs.mkdirSync(path.join(this.fallbackDir, 'private'), { recursive: true });
    } catch (e: any) {
      this.logger.error(`Failed to create fallback media dir: ${e.message}`);
    }
  }

  async ensureBuckets() {
    if (!this.minioClient || !this.minioAvailable) {
      if (this.isProduction) {
        throw new ServiceUnavailableException('Production object storage is unavailable');
      }
      this.ensureFallbackDir();
      return;
    }

    try {
      const mediaBucket = 'media';
      const privateBucket = 'private';

      const mediaExists = await this.minioClient.bucketExists(mediaBucket);
      if (!mediaExists) {
        await this.minioClient.makeBucket(mediaBucket);
        try {
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${mediaBucket}/*`],
              },
            ],
          };
          await this.minioClient.setBucketPolicy(
            mediaBucket,
            JSON.stringify(policy),
          );
        } catch (pe: any) {
          this.logger.warn(`Failed to set public-read policy on media bucket: ${pe.message}`);
        }
      }

      const privateExists = await this.minioClient.bucketExists(privateBucket);
      if (!privateExists) {
        await this.minioClient.makeBucket(privateBucket);
      }
    } catch (e: any) {
      this.minioAvailable = false;
      if (this.isProduction) {
        throw new ServiceUnavailableException(`Production object storage bucket verification failed: ${e.message}`);
      }
      this.logger.warn(`MinIO ensureBuckets failed, using fallback fs: ${e.message}`);
      this.ensureFallbackDir();
    }
  }

  validateFile(
    buffer: Buffer,
    mimetype: string,
    originalname: string,
  ): void {
    if (!buffer || buffer.length === 0) {
      throw new UnprocessableEntityException('Empty file');
    }

    const maxSize = mimetype.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (buffer.length > maxSize) {
      throw new UnprocessableEntityException(
        `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB for this media type`,
      );
    }

    if (!ALLOWED_MIMES.includes(mimetype)) {
      throw new UnprocessableEntityException(
        `MIME type ${mimetype} not allowed. Allowed: ${ALLOWED_MIMES.join(', ')}`,
      );
    }

    const ext = path.extname(originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new UnprocessableEntityException(
        `File extension ${ext} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }
  }

  async upload(
    file: Express.Multer.File,
    userId: string,
    isPublic = true,
    companyId?: string,
    branchId?: string,
  ) {
    this.validateFile(file.buffer, file.mimetype, file.originalname);

    if (companyId) {
      const company = await this.prisma.companies.findUnique({
        where: { id: companyId },
        select: { owner_user_id: true },
      });
      if (!company) throw new ServiceUnavailableException('Company not found');
      const scope = await this.prisma.user_role_scopes.findFirst({
        where: { user_id: userId, company_id: companyId },
        select: { id: true, branch_id: true, scope_type: true },
      });
      if (company.owner_user_id !== userId && !scope) {
        throw new ServiceUnavailableException('This account cannot upload media for the company');
      }
      if (branchId) {
        const branch = await this.prisma.branches.findFirst({
          where: { id: branchId, company_id: companyId, deleted_at: null },
          select: { id: true },
        });
        if (!branch) throw new ServiceUnavailableException('Branch is invalid');
        if (scope?.scope_type === 'branch' && scope.branch_id && scope.branch_id !== branchId) {
          throw new ServiceUnavailableException('This account cannot upload media for that branch');
        }
      }
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const objectName = `${crypto.randomUUID()}${ext}`;
    const bucket = isPublic ? 'media' : 'private';
    let storageProvider = this.minioAvailable ? 'minio' : 'fs';
    const mimeCategory = file.mimetype.startsWith('image/')
      ? 'image'
      : file.mimetype.startsWith('video/')
      ? 'video'
      : 'other';

    try {
      if (this.minioAvailable && this.minioClient) {
        await this.minioClient.putObject(
          bucket,
          objectName,
          file.buffer,
          file.buffer.length,
          {
            'Content-Type': file.mimetype,
          },
        );
      } else {
        this.ensureFallbackDir();
        const filePath = path.join(this.fallbackDir, bucket, objectName);
        fs.writeFileSync(filePath, file.buffer);
      }
    } catch (e: any) {
      this.logger.error(`Upload to storage failed: ${e.message}`);
      if (this.isProduction) {
        throw new ServiceUnavailableException('Media storage is temporarily unavailable');
      }
      if (this.minioAvailable) {
        this.logger.warn('Falling back to development filesystem storage');
        this.minioAvailable = false;
        storageProvider = 'fs';
        this.ensureFallbackDir();
        const filePath = path.join(this.fallbackDir, bucket, objectName);
        fs.writeFileSync(filePath, file.buffer);
      } else {
        throw e;
      }
    }

    let mediaRecord: MediaRecord | null = null;
    try {
      mediaRecord = await this.prisma.media.create({
        data: {
          uploader_user_id: userId,
          company_id: companyId ?? null,
          branch_id: branchId ?? null,
          storage_key: objectName,
          original_file_name: file.originalname,
          stored_file_name: objectName,
          storage_bucket: bucket,
          storage_provider: storageProvider,
          mime_category: mimeCategory,
          mime_type: file.mimetype,
          size_bytes: file.buffer.length,
          width_pixels: null,
          height_pixels: null,
          is_public: isPublic,
          status: 'uploaded',
          created_at: new Date(),
        },
      });
    } catch (e: any) {
      this.logger.error(`Failed to create durable media record: ${e.message}`);
      if (this.isProduction) {
        // Best-effort cleanup prevents an orphan object when database persistence fails.
        if (this.minioClient && this.minioAvailable) {
          await this.minioClient.removeObject(bucket, objectName).catch(() => undefined);
        }
        throw new ServiceUnavailableException('Unable to persist uploaded media');
      }
      mediaRecord = {
        id: crypto.randomUUID(),
        uploader_user_id: userId,
        company_id: companyId ?? null,
        branch_id: branchId ?? null,
        storage_key: objectName,
        original_file_name: file.originalname,
        stored_file_name: objectName,
        storage_bucket: bucket,
        storage_provider: storageProvider,
        mime_category: mimeCategory,
        mime_type: file.mimetype,
        size_bytes: file.buffer.length,
        width_pixels: null,
        height_pixels: null,
        is_public: isPublic,
        status: 'uploaded',
        created_at: new Date(),
      };
    }

    if (
      this.mediaProcessQueue &&
      file.mimetype.startsWith('image/')
    ) {
      try {
        await this.mediaProcessQueue.add(
          'process-variants',
          { mediaId: mediaRecord.id },
          { jobId: `media:${mediaRecord.id}`, attempts: 4, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: 500, removeOnFail: 1000 },
        );
      } catch (qe: any) {
        this.logger.warn(`Failed to add media-process job: ${qe.message}`);
      }
    }

    const publicBase = this.configService.get<string>('MEDIA_PUBLIC_BASE_URL')?.replace(/\/$/, '');
    const originalUrl = isPublic && publicBase ? `${publicBase}/${bucket}/${objectName}` : null;

    return {
      ...mediaRecord,
      originalUrl,
      variants: [],
      processing: file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/'),
    };
  }

  async getPresignedUrl(
    objectKey: string,
    bucket?: string,
    expiresSec = 3600,
  ): Promise<string> {
    const bucketName = bucket ?? 'media';
    if (this.minioAvailable && this.minioClient) {
      try {
        return await this.minioClient.presignedGetObject(
          bucketName,
          objectKey,
          expiresSec,
        );
      } catch (e: any) {
        this.logger.warn(`Failed to generate presigned URL: ${e.message}`);
      }
    }
    if (this.isProduction) {
      throw new ServiceUnavailableException('Unable to generate media access URL');
    }
    return `/media/${bucketName}/${objectKey}`;
  }

  async getMediaById(id: string) {
    try {
      return await this.prisma.media.findUnique({
        where: { id },
      });
    } catch (e: any) {
      this.logger.error(`Failed to fetch media ${id}: ${e.message}`);
      if (this.isProduction) throw new ServiceUnavailableException('Unable to read media record');
      return null;
    }
  }

  private isTableMissingError(e: any): boolean {
    const msg = (e?.message || '').toLowerCase();
    return (
      msg.includes('does not exist') ||
      (msg.includes('relation') && msg.includes('not found'))
    );
  }
}
