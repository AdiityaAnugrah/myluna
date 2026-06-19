import { useQuery } from '@tanstack/react-query';
import { regionsApi } from '@/lib/api/regions';

export function useProvinces() {
  return useQuery({
    queryKey: ['regions', 'provinces'],
    queryFn: regionsApi.getProvinces,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useRegencies(provinceId: string) {
  return useQuery({
    queryKey: ['regions', 'regencies', provinceId],
    queryFn: () => regionsApi.getRegencies(provinceId),
    enabled: !!provinceId,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useDistricts(regencyId: string) {
  return useQuery({
    queryKey: ['regions', 'districts', regencyId],
    queryFn: () => regionsApi.getDistricts(regencyId),
    enabled: !!regencyId,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useVillages(districtId: string) {
  return useQuery({
    queryKey: ['regions', 'villages', districtId],
    queryFn: () => regionsApi.getVillages(districtId),
    enabled: !!districtId,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
