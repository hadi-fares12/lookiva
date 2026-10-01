'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { APIPaths, type ProfessionalProfileResponse } from '@lookiva/api-contracts';

export function useProfessional(id: string | null | undefined) {
  return useQuery<ProfessionalProfileResponse>({
    queryKey: ['professionals', id],
    queryFn: async () => {
      if (!id) throw new Error('No professional id');
      const { data } = await axios.get(APIPaths.PROFESSIONALS_ID_PROFILE(id));
      return data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useFollowProfessional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.post('/customer/following', { targetType: 'professional', targetId: id, professionalId: id });
      return data;
    },
    onSuccess: (_d: unknown, id: string) => {
      queryClient.invalidateQueries({ queryKey: ['professionals', id] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
    },
  });
}

export function useUnfollowProfessional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/customer/following/target/professional/${id}`);
      return data;
    },
    onSuccess: (_d: unknown, id: string) => {
      queryClient.invalidateQueries({ queryKey: ['professionals', id] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
    },
  });
}


