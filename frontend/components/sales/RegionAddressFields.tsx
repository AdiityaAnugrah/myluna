'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDistricts, useProvinces, useRegencies, useVillages } from '@/lib/hooks/useRegions';
import { cn } from '@/lib/utils';
import { formatRegionLabel } from '@/lib/utils/format';
import { RegionOption, VillageOption } from '@/types';

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
  errors?: Partial<Record<keyof ShippingAddressValue, string>>;
  showErrors?: boolean;
}

function LoadingOption() {
  return (
    <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Memuat wilayah...
    </div>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanAddressSeparators(value: string) {
  return value
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(?:,\s*){2,}/g, ', ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .trim();
}

export function sanitizeShippingAddressDetail(
  input: string,
  options: { postalCode?: string; regionLabels?: Array<string | undefined | null> } = {}
) {
  let sanitized = input;

  if (options.postalCode) {
    const postalPattern = new RegExp(`(?:kode\\s*pos\\s*:?\\s*)?\\b${escapeRegExp(options.postalCode)}\\b`, 'gi');
    sanitized = sanitized.replace(postalPattern, '');
  }

  for (const label of options.regionLabels || []) {
    const normalizedLabel = String(label || '').trim();
    if (!normalizedLabel) continue;

    sanitized = sanitized.replace(new RegExp(`\\b${escapeRegExp(normalizedLabel)}\\b`, 'gi'), '');
  }

  return cleanAddressSeparators(sanitized);
}

interface SearchableRegionSelectProps<TOption extends RegionOption | VillageOption> {
  title: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  value: string;
  options: TOption[];
  disabled?: boolean;
  isLoading?: boolean;
  renderLabel: (option: TOption) => string;
  onSelect: (value: string) => void;
  errorMessage?: string;
  showError?: boolean;
}

function SearchableRegionSelect<TOption extends RegionOption | VillageOption>({
  title,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  value,
  options,
  disabled,
  isLoading,
  renderLabel,
  onSelect,
  errorMessage,
  showError,
}: SearchableRegionSelectProps<TOption>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = options.find((item) => String(item.id) === value);
  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return options;

    return options.filter((item) => renderLabel(item).toLowerCase().includes(normalizedSearch));
  }, [options, renderLabel, search]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-invalid={showError ? true : undefined}
        className={cn(
          'w-full justify-between font-normal',
          showError && 'border-destructive text-destructive focus-visible:ring-destructive'
        )}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
          {selectedOption ? renderLabel(selectedOption) : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {showError && errorMessage && (
        <p className="text-xs font-medium text-destructive" role="alert">{errorMessage}</p>
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSearch('');
        }}
      >
        <DialogContent className="flex h-[80vh] max-h-[80vh] flex-col gap-0 p-0 sm:max-w-[560px]">
          <DialogHeader className="border-b px-4 py-4">
            <DialogTitle>{title}</DialogTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
                autoFocus
              />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <LoadingOption />
            ) : filteredOptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
                <MapPin className="mb-3 h-10 w-10 opacity-20" />
                <p>{emptyMessage}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOptions.map((item) => {
                  const itemValue = String(item.id);
                  const isSelected = itemValue === value;

                  return (
                    <button
                      key={itemValue}
                      type="button"
                      className={cn(
                        'flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted'
                      )}
                      onClick={() => {
                        onSelect(itemValue);
                        setOpen(false);
                        setSearch('');
                      }}
                    >
                      <span className="break-words text-sm">{renderLabel(item)}</span>
                      {isSelected && (
                        <span className="rounded-full bg-primary p-0.5 text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RegionAddressFields({ value, onChange, disabled, errors, showErrors }: RegionAddressFieldsProps) {
  const provincesQuery = useProvinces();
  const regenciesQuery = useRegencies(value.provinceId);
  const districtsQuery = useDistricts(value.regencyId);
  const villagesQuery = useVillages(value.districtId);

  const update = (changes: Partial<ShippingAddressValue>) => {
    onChange({ ...value, ...changes });
  };

  const villages = villagesQuery.data?.data || [];
  const selectedRegionLabels = useMemo(() => {
    const province = provincesQuery.data?.data.find((item) => String(item.id) === value.provinceId);
    const regency = regenciesQuery.data?.data.find((item) => String(item.id) === value.regencyId);
    const district = districtsQuery.data?.data.find((item) => String(item.id) === value.districtId);
    const village = villages.find((item) => String(item.id) === value.villageId);

    return [
      formatRegionLabel(village?.label),
      formatRegionLabel(district?.label),
      formatRegionLabel(regency?.label),
      formatRegionLabel(province?.label),
    ];
  }, [
    provincesQuery.data?.data,
    regenciesQuery.data?.data,
    districtsQuery.data?.data,
    villages,
    value.provinceId,
    value.regencyId,
    value.districtId,
    value.villageId,
  ]);

  const sanitizeDetail = (input: string) => sanitizeShippingAddressDetail(input, {
    postalCode: value.postalCode,
    regionLabels: selectedRegionLabels,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Provinsi <span className="text-destructive">*</span></Label>
          <SearchableRegionSelect
            title="Pilih Provinsi"
            placeholder="Pilih provinsi"
            searchPlaceholder="Cari provinsi..."
            emptyMessage="Provinsi tidak ditemukan."
            value={value.provinceId}
            options={provincesQuery.data?.data || []}
            isLoading={provincesQuery.isLoading}
            disabled={disabled || provincesQuery.isLoading}
            renderLabel={(item) => formatRegionLabel(item.label)}
            onSelect={(provinceId) => update({
              provinceId,
              regencyId: '',
              districtId: '',
              villageId: '',
              postalCode: '',
            })}
            showError={showErrors && !!errors?.provinceId}
            errorMessage={errors?.provinceId}
          />
        </div>

        <div className="space-y-2">
          <Label>Kabupaten/Kota <span className="text-destructive">*</span></Label>
          <SearchableRegionSelect
            title="Pilih Kabupaten/Kota"
            placeholder="Pilih kabupaten/kota"
            searchPlaceholder="Cari kabupaten/kota..."
            emptyMessage="Kabupaten/kota tidak ditemukan."
            value={value.regencyId}
            options={regenciesQuery.data?.data || []}
            isLoading={regenciesQuery.isLoading}
            disabled={disabled || !value.provinceId || regenciesQuery.isLoading}
            renderLabel={(item) => formatRegionLabel(item.label)}
            onSelect={(regencyId) => update({
              regencyId,
              districtId: '',
              villageId: '',
              postalCode: '',
            })}
            showError={showErrors && !!errors?.regencyId}
            errorMessage={errors?.regencyId}
          />
        </div>

        <div className="space-y-2">
          <Label>Kecamatan <span className="text-destructive">*</span></Label>
          <SearchableRegionSelect
            title="Pilih Kecamatan"
            placeholder="Pilih kecamatan"
            searchPlaceholder="Cari kecamatan..."
            emptyMessage="Kecamatan tidak ditemukan."
            value={value.districtId}
            options={districtsQuery.data?.data || []}
            isLoading={districtsQuery.isLoading}
            disabled={disabled || !value.regencyId || districtsQuery.isLoading}
            renderLabel={(item) => formatRegionLabel(item.label)}
            onSelect={(districtId) => update({
              districtId,
              villageId: '',
              postalCode: '',
            })}
            showError={showErrors && !!errors?.districtId}
            errorMessage={errors?.districtId}
          />
        </div>

        <div className="space-y-2">
          <Label>Kelurahan/Desa <span className="text-destructive">*</span></Label>
          <SearchableRegionSelect
            title="Pilih Kelurahan/Desa"
            placeholder="Pilih kelurahan/desa"
            searchPlaceholder="Cari kelurahan/desa atau kode pos..."
            emptyMessage="Kelurahan/desa tidak ditemukan."
            value={value.villageId}
            options={villages}
            isLoading={villagesQuery.isLoading}
            disabled={disabled || !value.districtId || villagesQuery.isLoading}
            renderLabel={(item) =>
              `${formatRegionLabel(item.label)}${item.postalCode ? ` - ${item.postalCode}` : ''}`
            }
            onSelect={(villageId) => {
              const village = villages.find((item) => String(item.id) === villageId);
              update({
                villageId,
                postalCode: village?.postalCode || '',
              });
            }}
            showError={showErrors && !!errors?.villageId}
            errorMessage={errors?.villageId}
          />
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
            onChange={(event) => update({ addressDetail: sanitizeDetail(event.target.value) })}
            onBlur={(event) => update({ addressDetail: sanitizeDetail(event.target.value).trim() })}
            disabled={disabled}
            rows={3}
            maxLength={160}
            placeholder="Nama jalan, nomor rumah, RT/RW, patokan"
            aria-invalid={showErrors && !!errors?.addressDetail ? true : undefined}
            className={cn(showErrors && errors?.addressDetail && 'border-destructive focus-visible:ring-destructive')}
          />
          {showErrors && errors?.addressDetail && (
            <p className="text-xs font-medium text-destructive" role="alert">{errors.addressDetail}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Isi hanya jalan/nomor/patokan. Kelurahan, kecamatan, kota, provinsi, dan kode pos diambil otomatis dari pilihan wilayah.
          </p>
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
