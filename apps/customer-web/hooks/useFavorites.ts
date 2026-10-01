'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import {
  APIPaths,
  type FavoritesCreateRequest,
  type FavoritesListResponse,
} from '@lookiva/api-contracts';

export function useFavorites(opts?: { enabled?: boolean }) {
  return useQuery<FavoritesListResponse>({
    queryKey: ['favorites'],
    queryFn: async () => {
      const { data } = await axios.get(APIPaths.FAVORITES);
      return data;
    },
    enabled: opts?.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: FavoritesCreateRequest) => {
      const { data } = await axios.post(APIPaths.FAVORITES_TOGGLE, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
    },
  });
}


