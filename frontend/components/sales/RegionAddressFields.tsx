'use client';

import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDistricts, useProvinces, useRegencies, useVillages } from '@/lib/hooks/useRegions';

export interface ShippingAddressValue {
  addressDetail: string;
  provinceId: string;
  regencyId: string;
  districtId: string;
  villageId: string;
  postalCode: string;
}

interface RegionAddressFieldsProps {
  value: ShippingAddressValue;
  onChange: (value: ShippingAddressValue) => void;
  disabled?: boolean;
}

function LoadingOption() {
  return (
    <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Memuat wilayah...
    </div>
  );
}

export function RegionAddressFields({ value, onChange, disabled }: RegionAddressFieldsProps) {
  const provincesQuery = useProvinces();
  const regenciesQuery = useRegencies(value.provinceId);
  const districtsQuery = useDistricts(value.regencyId);
  const villagesQuery = useVillages(value.districtId);

  const update = (changes: Partial<ShippingAddressValue>) => {
    onChange({ ...value, ...changes });
  };

  const villages = villagesQuery.data?.data || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Provinsi <span className="text-destructive">*</span></Label>
          <Select
            value={value.provinceId}
            onValueChange={(provinceId) => update({
              provinceId,
              regencyId: '',
              districtId: '',
              villageId: '',
              postalCode: '',
            })}
            disabled={disabled || provincesQuery.isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih provinsi" />
            </SelectTrigger>
            <SelectContent>
              {provincesQuery.isLoading ? <LoadingOption /> : provincesQuery.data?.data.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Kabupaten/Kota <span className="text-destructive">*</span></Label>
          <Select
            value={value.regencyId}
            onValueChange={(regencyId) => update({
              regencyId,
              districtId: '',
              villageId: '',
              postalCode: '',
            })}
            disabled={disabled || !value.provinceId || regenciesQuery.isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih kabupaten/kota" />
            </SelectTrigger>
            <SelectContent>
              {regenciesQuery.isLoading ? <LoadingOption /> : regenciesQuery.data?.data.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Kecamatan <span className="text-destructive">*</span></Label>
          <Select
            value={value.districtId}
            onValueChange={(districtId) => update({
              districtId,
              villageId: '',
              postalCode: '',
            })}
            disabled={disabled || !value.regencyId || districtsQuery.isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih kecamatan" />
            </SelectTrigger>
            <SelectContent>
              {districtsQuery.isLoading ? <LoadingOption /> : districtsQuery.data?.data.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Kelurahan/Desa <span className="text-destructive">*</span></Label>
          <Select
            value={value.villageId}
            onValueChange={(villageId) => {
              const village = villages.find((item) => String(item.id) === villageId);
              update({
                villageId,
                postalCode: village?.postalCode || '',
              });
            }}
            disabled={disabled || !value.districtId || villagesQuery.isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih kelurahan/desa" />
            </SelectTrigger>
            <SelectContent>
              {villagesQuery.isLoading ? <LoadingOption /> : villages.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.label}{item.postalCode ? ` - ${item.postalCode}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
        <div className="space-y-2">
          <Label htmlFor="shippingAddressDetail">
            Detail Alamat <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="shippingAddressDetail"
            value={value.addressDetail}
            onChange={(event) => update({ addressDetail: event.target.value })}
            disabled={disabled}
            rows={3}
            placeholder="Nama jalan, nomor rumah, RT/RW, patokan"
          />
        </div>

        <div className="space-y-2">
          <Label>Kode Pos</Label>
          <div className="flex min-h-10 items-center rounded-md border bg-muted/40 px-3 text-sm">
            {value.postalCode || '-'}
          </div>
        </div>
      </div>
    </div>
  );
}
