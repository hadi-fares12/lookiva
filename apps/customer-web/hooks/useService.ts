'use client';

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { APIPaths, type ServiceDetailResponse } from '@lookiva/api-contracts';

export function useService(id: string | null | undefined) {
  return useQuery<ServiceDetailResponse>({
    queryKey: ['services', id],
    queryFn: async () => {
      if (!id) throw new Error('No service id');
      const { data } = await axios.get(APIPaths.SERVICES_ID(id));
      return data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}


