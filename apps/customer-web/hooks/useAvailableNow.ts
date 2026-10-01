'use client';

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { APIPaths, type AvailableNowResponse } from '@lookiva/api-contracts';

export function useAvailableNow(params: {
  lat?: number;
  lon?: number;
  radiusMeters?: number;
  windowMinutes?: number;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) {
  const { lat, lon, radiusMeters = 5000, windowMinutes = 120, limit = 20, offset = 0, enabled = true } = params;
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lon);
  return useQuery<AvailableNowResponse>({
    queryKey: ['discovery', 'available-now', lat, lon, radiusMeters, windowMinutes, limit, offset],
    queryFn: async () => {
      if (!hasCoordinates || lat == null || lon == null) throw new Error('Location is required.');
      const { data } = await axios.get(APIPaths.DISCOVERY_AVAILABLE_NOW, {
        params: { lat, lon, radiusMeters, windowMinutes, limit, offset },
      });
      return data;
    },
    enabled: enabled && hasCoordinates,
    staleTime: 20_000,
    refetchInterval: 60_000,
  });
}
