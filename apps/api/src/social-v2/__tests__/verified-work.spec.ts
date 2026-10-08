import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SocialV2Service } from '../social-v2.service';

const author = {
  id: 'user-1',
  roleScopes: [],
} as any;

function fixture() {
  const post = {
    id: 'post-1',
    author_user_id: 'user-1',
    company_id: 'company-1',
    branch_id: 'branch-1',
    professional_id: 'pro-1',
    status: 'published',
    is_verified_work: false,
    deleted_at: null,
    services: [{ service_id: 'service-1' }],
  };

  const appointment = {
    id: 'appointment-1',
    company_id: 'company-1',
    branch_id: 'branch-1',
    status: 'completed',
    completed_at: new Date(),
    participants: [{ professional_id: 'pro-1' }],
    services: [{ service_id: 'service-1' }],
  };

  const review = {
    id: 'review-1',
    company_id: 'company-1',
    professional_id: 'pro-1',
    service_id: 'service-1',
    appointment_id: 'appointment-1',
    is_verified: true,
    status: 'published',
    deleted_at: null,
    appointment,
  };

  const prisma = {
    posts: {
      findFirst: vi.fn().mockResolvedValue(post),
      update: vi.fn().mockResolvedValue({
        ...post,
        is_verified_work: true,
        verified_review: {
          id: 'review-1',
          overall_rating: 5,
          is_verified: true,
        },
        verified_appointment: appointment,
      }),
    },
    reviews: {
      findFirst: vi.fn().mockResolvedValue(review),
    },
    audit_logs: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
    professionals: {
      findFirst: vi.fn(),
    },
  } as any;

  return {
    service: new SocialV2Service(prisma, {} as any),
    prisma,
    post,
    review,
  };
}

describe('Verified Work provenance', () => {
  it('links a post only to a matching verified review and completed appointment', async () => {
    const { service, prisma } = fixture();

    await service.verifyWork(author, 'post-1', { reviewId: 'review-1' });

    expect(prisma.posts.update).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: expect.objectContaining({
        verified_review_id: 'review-1',
        verified_appointment_id: 'appointment-1',
        is_verified_work: true,
        verified_work_at: expect.any(Date),
      }),
      include: expect.any(Object),
    });
    expect(prisma.audit_logs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'social.post.verify_work',
        entity_id: 'post-1',
        company_id: 'company-1',
      }),
    });
  });

  it('rejects a review from a different business', async () => {
    const { service, prisma, review } = fixture();
    prisma.reviews.findFirst.mockResolvedValue({
      ...review,
      company_id: 'company-2',
    });

    await expect(
      service.verifyWork(author, 'post-1', { reviewId: 'review-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.posts.update).not.toHaveBeenCalled();
  });

  it('rejects publishing under a business identity without company or professional scope', async () => {
    const { service, prisma } = fixture();
    prisma.professionals.findFirst.mockResolvedValue(null);

    await expect(
      service.createPost(author, {
        companyId: 'company-1',
        title: 'Unauthorized work',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
