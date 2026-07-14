'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFeatures, useUpdateFeature } from '@/lib/hooks/useFeatures';
import type { AppRole, FeatureFlag } from '@/types';
import { Code2, ShieldCheck, SlidersHorizontal } from 'lucide-react';

const ROLE_OPTIONS: AppRole[] = ['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN', 'DEV'];

function roleLabel(role: AppRole) {
  const labels: Record<AppRole, string> = {
    USER: 'User',
    TCP: 'TCP',
    ADMIN: 'Admin',
    SUPER_ADMIN: 'Super Admin',
    DEV: 'Dev',
    TESTING: 'Testing',
  };
  return labels[role] || role;
}

function FeatureRow({ feature }: { feature: FeatureFlag }) {
  const updateFeature = useUpdateFeature();
  const isSaving = updateFeature.isPending;

  const toggleRole = (role: AppRole, checked: boolean) => {
    const currentRoles = feature.allowedRoles || [];
    const nextRoles: AppRole[] = checked
      ? Array.from(new Set<AppRole>([...currentRoles, role, 'DEV']))
      : currentRoles.filter((item) => item !== role);

    updateFeature.mutate({
      id: feature.id,
      data: { allowedRoles: Array.from(new Set<AppRole>([...nextRoles, 'DEV'])) },
    });
  };

  return (
    <TableRow>
      <TableCell className="align-top">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{feature.label}</span>
            {!feature.isEnabled && <Badge variant="outline">Nonaktif</Badge>}
            {feature.isDevelopment && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                Pengembangan
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{feature.description || 'Tidak ada deskripsi.'}</p>
          <p className="text-[11px] text-muted-foreground">
            Key: <span className="font-mono">{feature.key}</span> · Path: <span className="font-mono">{feature.path || '-'}</span>
          </p>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={feature.isEnabled}
              disabled={isSaving}
              onCheckedChange={(checked) => updateFeature.mutate({ id: feature.id, data: { isEnabled: checked } })}
              aria-label={`Aktifkan ${feature.label}`}
            />
            <span className="text-sm">{feature.isEnabled ? 'Aktif' : 'Off'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={feature.isDevelopment}
              disabled={isSaving}
              onCheckedChange={(checked) => updateFeature.mutate({ id: feature.id, data: { isDevelopment: checked } })}
              aria-label={`Tandai ${feature.label} sebagai pengembangan`}
            />
            <span className="text-sm">Maintenance/Pengembangan</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_OPTIONS.map((role) => {
            const checked = (feature.allowedRoles || []).includes(role);
            return (
              <label key={role} className="flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
                <Checkbox
                  checked={checked}
                  disabled={isSaving || role === 'DEV'}
                  onCheckedChange={(value) => toggleRole(role, value === true)}
                  aria-label={`Akses ${roleLabel(role)} untuk ${feature.label}`}
                />
                <span>{roleLabel(role)}</span>
              </label>
            );
          })}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function DevFeatureControlPage() {
  const { user } = useAuth();
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const { data, isLoading, refetch } = useFeatures();
  const features = data?.data || [];

  if (role !== 'DEV') {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Akses DEV dibutuhkan</CardTitle>
          <CardDescription>Halaman ini khusus untuk role DEV karena berisi kontrol semua fitur dan role.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Dev Control</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Atur fitur mana yang aktif, role mana yang boleh melihat, dan kunci fitur yang masih maintenance/pengembangan.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4" /> Total Fitur
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{features.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Aktif
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{features.filter((item) => item.isEnabled).length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Masa Pengembangan</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{features.filter((item) => item.isDevelopment).length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Fitur</CardTitle>
          <CardDescription>
            Dibuat sederhana: aktif/off, mode maintenance/pengembangan, lalu centang role yang boleh melihat fitur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <Label className="font-semibold">Catatan:</Label> Role DEV selalu punya akses dan tidak bisa dimatikan dari daftar role.
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">Fitur</TableHead>
                  <TableHead className="min-w-[210px]">Status</TableHead>
                  <TableHead className="min-w-[360px]">Akses Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      Memuat fitur...
                    </TableCell>
                  </TableRow>
                ) : features.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      Belum ada data fitur.
                    </TableCell>
                  </TableRow>
                ) : (
                  features.map((feature) => <FeatureRow key={feature.id} feature={feature} />)
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
