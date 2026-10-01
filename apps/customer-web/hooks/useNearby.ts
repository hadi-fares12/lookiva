'use client';

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { APIPaths, type NearbyRequest, type NearbyResponse } from '@lookiva/api-contracts';

type NearbyParams = Omit<NearbyRequest, 'lat' | 'lon'> & {
  lat?: number;
  lon?: number;
  enabled?: boolean;
};

export function useNearby(params: NearbyParams) {
  const { enabled = true, lat, lon, radiusMeters = 1000, ...rest } = params;
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lon);

  return useQuery<NearbyResponse>({
    queryKey: ['discovery', 'nearby', lat, lon, radiusMeters, rest],
    queryFn: async () => {
      if (!hasCoordinates || lat == null || lon == null) {
        throw new Error('Location is required for nearby discovery.');
      }
      const { data } = await axios.get(APIPaths.DISCOVERY_NEARBY, {
        params: { lat, lon, radiusMeters, ...rest },
      });
      return data;
    },
    enabled: enabled && hasCoordinates,
    staleTime: 30_000,
  });
}
