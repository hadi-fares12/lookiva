'use client';

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { APIPaths, type FollowingListResponse } from '@lookiva/api-contracts';

export function useFollowing(opts?: { enabled?: boolean }) {
  return useQuery<FollowingListResponse>({
    queryKey: ['following'],
    queryFn: async () => {
      const { data } = await axios.get(APIPaths.FOLLOWING);
      return data;
    },
    enabled: opts?.enabled ?? true,
    staleTime: 60_000,
  });
}


