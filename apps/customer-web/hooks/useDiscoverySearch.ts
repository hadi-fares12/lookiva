'use client';

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import {
  APIPaths,
  type DiscoverySearchRequest,
  type DiscoverySearchResponse,
} from '@lookiva/api-contracts';

export function useDiscoverySearch(filters: DiscoverySearchRequest & { enabled?: boolean } = {}) {
  const { enabled = true, ...rest } = filters;

  return useQuery<DiscoverySearchResponse>({
    queryKey: ['discovery', 'search', JSON.stringify(rest)],
    queryFn: async () => {
      const { data } = await axios.get(APIPaths.DISCOVERY_SEARCH, { params: rest });
      return data;
    },
    enabled: enabled,
    staleTime: 30_000,
  });
}


