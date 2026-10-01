'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { APIPaths, type HomeSectionsResponse } from '@lookiva/api-contracts';

export function useHomeSections(params?: {
  lat?: number;
  lon?: number;
  areaId?: string;
  enabled?: boolean;
}) {
  return useQuery<HomeSectionsResponse>({
    queryKey: ['discovery', 'home-sections', params?.lat, params?.lon, params?.areaId],
    queryFn: async () => {
      const { data } = await axios.get(APIPaths.DISCOVERY_HOME_SECTIONS, {
        params: {
          lat: params?.lat,
          lon: params?.lon,
          areaId: params?.areaId,
        },
      });
      return data;
    },
    enabled: params?.enabled ?? true,
    staleTime: 60_000,
    refetchOnMount: false,
  });
}


