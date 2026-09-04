'use client';

import { useState } from 'react';
import { useProducts, useDeleteProduct, useBulkDeleteProducts, useBulkUpdateProducts } from '@/lib/hooks/useProducts';
import { useAuthStore } from '@/lib/stores/auth';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Plus, Search, Pencil, Trash2, AlertTriangle, ArrowLeftRight, Package, Download, BadgeDollarSign } from 'lucide-react';
import Link from 'next/link';
import { ProductRequestDialog } from '@/components/products/ProductRequestDialog';
import { PriceChangeRequestDialog } from '@/components/products/PriceChangeRequestDialog';
import { Product } from '@/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { Checkbox } from '@/components/ui/checkbox';

import { formatStatus } from '@/lib/utils/format';
import { exportToExcel, formatCurrencyForExport, formatDateForExport } from '@/lib/utils/exportUtils';
import { useCategories } from '@/lib/hooks/useCategories';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');
  const isLowStockFilter = filter === 'low-stock';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [parentCategoryId, setParentCategoryId] = useState<string>('all');
  const [subCategoryId, setSubCategoryId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active'); // 'active', 'inactive', 'all'

  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.data || [];

  const mainCategories = categories.filter((c: any) => !c.parentId);
  const subCategories = categories.filter((c: any) => c.parentId === parentCategoryId);

  const activeCategoryId = subCategoryId !== 'all' ? subCategoryId : (parentCategoryId !== 'all' ? parentCategoryId : undefined);

  const { data, isLoading } = useProducts({ 
    search, 
    page, 
    limit, 
    categoryId: activeCategoryId,
    lowStock: isLowStockFilter,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active'
  });
  const deleteMutation = useDeleteProduct();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const { user } = useAuthStore();
  
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'DEV';

  const router = useRouter();

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const bulkDeleteMutation = useBulkDeleteProducts();
  const bulkUpdateMutation = useBulkUpdateProducts();

  const products = data?.data?.products || [];
  const pagination = data?.data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const handleDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete);
      setProductToDelete(null);
    }
  };


  const handleRequestStatusChange = (product: Product) => {
    setSelectedProduct(product);
    setRequestDialogOpen(true);
  };

  const handleRequestPriceChange = (product: Product) => {
    setSelectedProduct(product);
    setPriceDialogOpen(true);
  };

  const handleExportToExcel = async () => {
    if (!products || products.length === 0) {
      return;
    }

    const exportData = products.map((product: Product) => ({
      SKU: product.sku || '-',
      Nama: product.name,
      Kategori: product.category?.name || '-',
      'Harga Jual (Tanpa Garansi)': formatCurrencyForExport(product.sellingPrice),
      'Harga Pakai Garansi': product.warrantyPrice ? formatCurrencyForExport(product.warrantyPrice) : '-',
      Stok: product.stock,
      'Min Stok': product.minStock,
      Unit: product.unit,
      Status: product.isActive ? 'Aktif' : 'Nonaktif',
      'Dibuat Pada': formatDateForExport(product.createdAt),
    }));

    await exportToExcel(
      exportData,
      [
        { header: 'SKU', key: 'SKU', width: 15 },
        { header: 'Nama', key: 'Nama', width: 30 },
        { header: 'Kategori', key: 'Kategori', width: 20 },
        { header: 'Harga Jual (Tanpa Garansi)', key: 'Harga Jual (Tanpa Garansi)', width: 15 },
        { header: 'Harga Pakai Garansi', key: 'Harga Pakai Garansi', width: 15 },
        { header: 'Stok', key: 'Stok', width: 10 },
        { header: 'Min Stok', key: 'Min Stok', width: 10 },
        { header: 'Unit', key: 'Unit', width: 10 },
        { header: 'Status', key: 'Status', width: 10 },
        { header: 'Dibuat Pada', key: 'Dibuat Pada', width: 15 },
      ],
      `Produk_${new Date().toISOString().split('T')[0]}`,
      'Daftar Produk'
    );
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(products.map((p: Product) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, productId]);
    } else {
      setSelectedIds(selectedIds.filter(id => id !== productId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    await bulkDeleteMutation.mutateAsync(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    await bulkUpdateMutation.mutateAsync({
      ids: selectedIds,
      updates: { isActive: true },
    });
    setSelectedIds([]);
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return;
    await bulkUpdateMutation.mutateAsync({
      ids: selectedIds,
      updates: { isActive: false },
    });
    setSelectedIds([]);
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(typeof value === 'string' ? parseFloat(value) : value);
  };

  /** Returns sum of variant stocks if product has variants, otherwise product.stock */
  const getEffectiveStock = (product: Product): number => {
    let vars = (product as any).variants;
    if (typeof vars === 'string') {
      try { vars = JSON.parse(vars); } catch { vars = []; }
    }
    if (vars && Array.isArray(vars) && vars.length > 0) {
      return vars.reduce((s: number, v: any) => {
        return s + (typeof v === 'object' && v.stock !== undefined ? Number(v.stock) : 0);
      }, 0);
    }
    return Number(product.stock) || 0;
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Produk' }]} />
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">
            {isLowStockFilter ? 'Produk Stok Menipis' : 'Produk'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isLowStockFilter ? 'Daftar produk yang perlu restock segera' : 'Kelola inventaris produk Anda'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportToExcel} variant="outline" disabled={!products || products.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          {(isAdmin || user?.role === 'USER') && (
            <Link href="/products/new">
              <Button className="tour-products-add">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Produk
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 tour-products-search">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 bg-card border-border/50 focus-visible:ring-primary/20 transition-all rounded-xl"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <div className="w-[200px]">
                <Select
                  value={parentCategoryId}
                  onValueChange={(val) => {
                    setParentCategoryId(val);
                    setSubCategoryId('all');
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {mainCategories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[200px]">
                <Select
                  value={subCategoryId}
                  onValueChange={(val: string) => {
                    setSubCategoryId(val);
                    setPage(1);
                  }}
                  disabled={parentCategoryId === 'all' || subCategories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Sub-kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Sub-kategori</SelectItem>
                    {subCategories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[180px]">
                <Select
                  value={statusFilter}
                  onValueChange={(val: string) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status Produk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

            {/* Mobile View */}
          <div className="md:hidden space-y-3 animate-in fade-in-50">
            {isLoading ? (
                <div className="py-8 text-center space-y-3">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                    <p className="text-sm text-muted-foreground">Memuat produk...</p>
                </div>
            ) : products.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed rounded-xl bg-muted/30">
                    <Package className="h-10 w-10 mx-auto text-muted-foreground opacity-50 mb-2" />
                    <p className="text-muted-foreground text-xs">Tidak ada produk ditemukan</p>
                </div>
            ) : (
                products.map((product) => {
                    const effectiveStock = getEffectiveStock(product);
                    const isLowStock = effectiveStock <= Number(product.minStock);
                    return (
                        <div key={product.id} className="rounded-lg border bg-card p-2.5 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-1.5 gap-2">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                    {isAdmin && (
                                        <Checkbox
                                            checked={selectedIds.includes(product.id)}
                                            onCheckedChange={(checked) => handleSelectOne(product.id, checked as boolean)}
                                            className="mt-0.5 h-4 w-4"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-[12px] truncate">{product.name}</div>
                                        <div className="text-[10px] text-muted-foreground truncate">
                                            {product.category?.name || '-'}
                                        </div>
                                    </div>
                                </div>
                                <div className="scale-75 origin-top-right flex-shrink-0">
                                    <Badge variant={product.isActive ? 'default' : 'secondary'}>
                                        {formatStatus(product.isActive ? 'ACTIVE' : 'PASSIVE')}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] mb-1.5 bg-muted/30 p-1.5 rounded">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-muted-foreground">Stok:</span>
                                    <span className={isLowStock ? 'text-red-500 font-bold' : ''}>{effectiveStock}</span>
                                    {isLowStock && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-muted-foreground">Min:</span>
                                    <span>{product.minStock}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end mt-1.5 pt-1.5 border-t">
                                {isAdmin ? (
                                    <>
                                        <Link href={`/products/${product.id}`} className="flex-1">
                                            <Button variant="outline" size="sm" className="w-full h-7 text-[10px]">
                                                <Pencil className="h-3 w-3 mr-1.5" />
                                                Edit
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="w-8 h-7 px-0"
                                            onClick={() => handleDelete(product.id)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 w-full">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[10px]"
                                            onClick={() => handleRequestPriceChange(product)}
                                        >
                                            <BadgeDollarSign className="h-3 w-3 mr-1.5" />
                                            Ajukan Harga
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="h-7 text-[10px]"
                                            onClick={() => handleRequestStatusChange(product)}
                                        >
                                            <ArrowLeftRight className="h-3 w-3 mr-1.5" />
                                            Status
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
          </div>

          <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden animate-in [animation-delay:200ms] tour-products-list">
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === products.length && products.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Min Stok</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <span className="loading loading-spinner loading-md text-primary"></span>
                        <p>Memuat produk...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-muted-foreground">
                       <div className="flex flex-col items-center gap-2 opacity-40">
                          <Package className="h-12 w-12" />
                          <p>Tidak ada produk ditemukan</p>
                       </div>
                    </TableCell>
                  </TableRow>
                ) : (
                   products.map((product) => {
                    const effectiveStock = getEffectiveStock(product);
                    const isLowStock = effectiveStock <= Number(product.minStock);
                    return (
                      <TableRow key={product.id}>
                        {isAdmin && (
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(product.id)}
                              onCheckedChange={(checked) => handleSelectOne(product.id, checked as boolean)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          {product.category ? (
                            <div className="flex flex-col">
                              {product.category.parent && (
                                <span className="text-[10px] font-bold uppercase tracking-wide text-primary/60">
                                  {product.category.parent.name}
                                </span>
                              )}
                              <span className="text-sm">{product.category.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={isLowStock ? 'text-red-500 font-semibold' : ''}>
                              {effectiveStock}
                            </span>
                            {isLowStock && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{product.minStock}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-primary">
                              {formatCurrency(product.sellingPrice)}
                            </span>
                            {product.warrantyPrice && Number(product.warrantyPrice) > 0 && (
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                Garansi: {formatCurrency(product.warrantyPrice)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.isActive ? 'default' : 'secondary'}>
                            {formatStatus(product.isActive ? 'ACTIVE' : 'PASSIVE')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isAdmin ? (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  aria-label="Edit produk"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    console.log('Navigating to product:', product.id);
                                    router.push(`/products/${product.id}`);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(product.id)}
                                  disabled={deleteMutation.isPending}
                                  aria-label="Hapus produk"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRequestPriceChange(product)}
                                  title="Ajukan Perubahan Harga"
                                  aria-label="Ajukan perubahan harga produk"
                                >
                                  <BadgeDollarSign className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleRequestStatusChange(product)}
                                    title="Ajukan Perubahan Status"
                                    aria-label="Ajukan perubahan status produk"
                                >
                                    <ArrowLeftRight className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {pagination.total > 0 && (
             <Pagination
               currentPage={pagination.page}
               totalPages={pagination.totalPages}
               totalItems={pagination.total}
               itemsPerPage={pagination.limit}
               onPageChange={setPage}
               onItemsPerPageChange={(newLimit) => {
                 setLimit(newLimit);
                 setPage(1);
               }}
             />
           )}
        </div>

      {selectedProduct && (
        <ProductRequestDialog 
          product={selectedProduct}
          open={requestDialogOpen}
          onOpenChange={setRequestDialogOpen}
        />
      )}

      {selectedProduct && (
        <PriceChangeRequestDialog
          product={selectedProduct}
          open={priceDialogOpen}
          onOpenChange={setPriceDialogOpen}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Hapus Produk"
        description="Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        variant="destructive"
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onDelete={handleBulkDelete}
        onActivate={handleBulkActivate}
        onDeactivate={handleBulkDeactivate}
        onCancel={() => setSelectedIds([])}
        isLoading={bulkDeleteMutation.isPending || bulkUpdateMutation.isPending}
      />
    </div>

  );
}
