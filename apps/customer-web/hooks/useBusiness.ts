'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { APIPaths, type BusinessProfileResponse } from '@lookiva/api-contracts';

export function useBusiness(id: string | null | undefined, opts?: { lat?: number; lon?: number }) {
  return useQuery<BusinessProfileResponse>({
    queryKey: ['businesses', id, opts?.lat, opts?.lon],
    queryFn: async () => {
      if (!id) throw new Error('No business id');
      const { data } = await axios.get(APIPaths.BUSINESSES_ID_PROFILE(id), {
        params: { lat: opts?.lat, lon: opts?.lon },
      });
      return data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useFollowBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.post('/customer/following', { targetType: 'business', targetId: id, companyId: id });
      return data;
    },
    onSuccess: (_d: unknown, id: string) => {
      queryClient.invalidateQueries({ queryKey: ['businesses', id] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
    },
  });
}

export function useUnfollowBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/customer/following/target/business/${id}`);
      return data;
    },
    onSuccess: (_d: unknown, id: string) => {
      queryClient.invalidateQueries({ queryKey: ['businesses', id] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
    },
  });
}


