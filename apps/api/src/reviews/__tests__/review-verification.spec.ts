import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ReviewsService } from '../reviews.service';

function fixture(status = 'completed', ownerUserId = 'user-1') {
  const appointment = {
    id: 'appointment-1',
    customer_user_id: ownerUserId,
    company_id: 'company-1',
    branch_id: 'branch-1',
    status,
    participants: [
      {
        professional_id: 'pro-1',
        professional: { id: 'pro-1', company_id: 'company-1' },
      },
    ],
    services: [
      {
        service_id: 'service-1',
        service: { id: 'service-1', company_id: 'company-1' },
      },
    ],
  };

  const tx = {
    companies: {
      findFirst: vi.fn().mockResolvedValue({ id: 'company-1' }),
      update: vi.fn().mockResolvedValue(undefined),
    },
    appointments: {
      findUnique: vi.fn().mockResolvedValue(appointment),
    },
    branches: { findFirst: vi.fn() },
    professionals: {
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    },
    services: { findFirst: vi.fn() },
    media: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'media-1', mime_type: 'image/jpeg' },
        { id: 'media-2', mime_type: 'video/mp4' },
      ]),
    },
    reviews: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'review-1',
        company_id: 'company-1',
        professional_id: 'pro-1',
        appointment_id: 'appointment-1',
        service_id: 'service-1',
        is_verified: true,
      }),
      aggregate: vi.fn().mockResolvedValue({
        _avg: { overall_rating: 4.5 },
        _count: { id: 1 },
      }),
      findUnique: vi.fn().mockResolvedValue({
        id: 'review-1',
        is_verified: true,
        ratings: [],
        media_list: [],
        appointment: {
          id: 'appointment-1',
          status: 'completed',
          completed_at: new Date(),
        },
      }),
    },
    review_ratings: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    review_media: {
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
  } as any;

  const prisma = {
    $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
  } as any;

  return { service: new ReviewsService(prisma), tx };
}

describe('verified review integrity', () => {
  it('marks a review verified only when it comes from the customer completed appointment', async () => {
    const { service, tx } = fixture();

    await service.createReview('user-1', {
      companyId: 'company-1',
      appointmentId: 'appointment-1',
      professionalId: 'pro-1',
      serviceId: 'service-1',
      overallRating: 5,
      dimensionRatings: [{ dimension: 'quality', rating: 5 }],
      mediaIds: ['media-1', 'media-2'],
    });

    expect(tx.reviews.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        appointment_id: 'appointment-1',
        author_user_id: 'user-1',
        professional_id: 'pro-1',
        service_id: 'service-1',
        is_verified: true,
        status: 'published',
      }),
    });
    expect(tx.review_ratings.createMany).toHaveBeenCalledWith({
      data: [
        {
          review_id: 'review-1',
          dimension: 'quality',
          rating: 5,
        },
      ],
    });
    expect(tx.review_media.createMany).toHaveBeenCalledWith({
      data: [
        {
          review_id: 'review-1',
          media_id: 'media-1',
          media_type: 'image',
          sort_order: 0,
        },
        {
          review_id: 'review-1',
          media_id: 'media-2',
          media_type: 'video',
          sort_order: 1,
        },
      ],
    });
  });

  it('rejects verification before the appointment is completed', async () => {
    const { service, tx } = fixture('confirmed');

    await expect(
      service.createReview('user-1', {
        companyId: 'company-1',
        appointmentId: 'appointment-1',
        overallRating: 5,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.reviews.create).not.toHaveBeenCalled();
  });

  it('rejects a review for another customer appointment', async () => {
    const { service, tx } = fixture('completed', 'another-user');

    await expect(
      service.createReview('user-1', {
        companyId: 'company-1',
        appointmentId: 'appointment-1',
        overallRating: 5,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(tx.reviews.create).not.toHaveBeenCalled();
  });
});
