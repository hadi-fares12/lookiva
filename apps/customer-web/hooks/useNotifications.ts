'use client';

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { APIPaths, type NotificationListResponse } from '@lookiva/api-contracts';

export function useNotifications(opts?: { enabled?: boolean; limit?: number }) {
  return useQuery<NotificationListResponse>({
    queryKey: ['notifications', opts?.limit],
    queryFn: async () => {
      const { data } = await axios.get(APIPaths.NOTIFICATIONS, {
        params: { limit: opts?.limit ?? 20 },
      });
      return data;
    },
    enabled: opts?.enabled ?? true,
    staleTime: 30_000,
  });
}


