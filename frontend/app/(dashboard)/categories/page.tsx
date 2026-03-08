'use client';

import { useCategories, useDeleteCategory } from '@/lib/hooks/useCategories';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, CornerDownRight, Package } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';


export default function CategoriesPage() {
  const { data, isLoading } = useCategories();
  const deleteMutation = useDeleteCategory();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);


  const categories = data?.data || [];

  const displayCategories = (categories: any[]) => {
    const root = categories.filter((c: any) => !c.parentId);
    const flattened: any[] = [];

    const recurse = (list: any[], level: number) => {
      // Sort children by name
      const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
      
      sorted.forEach(item => {
        flattened.push({ ...item, level });
        const children = categories.filter((c: any) => c.parentId === item.id);
        if (children.length > 0) {
          recurse(children, level + 1);
        }
      });
    };

    recurse(root, 0);
    return flattened;
  };

  const tableData = displayCategories(categories);

  const handleDelete = (id: string) => {
    setCategoryToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete);
      setCategoryToDelete(null);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Kategori</h1>
          <p className="text-muted-foreground mt-1">Kelola kategori dan sub-kategori produk</p>
        </div>
        <Link href="/categories/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Kategori
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in [animation-delay:100ms]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Sub-kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                    <p>Memuat kategori...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : tableData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                   <div className="flex flex-col items-center gap-2 opacity-40">
                      <Package className="h-12 w-12" />
                      <p>Tidak ada kategori ditemukan</p>
                   </div>
                </TableCell>
              </TableRow>
            ) : (
              tableData.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">
                      <div className="flex items-center" style={{ paddingLeft: `${category.level * 24}px` }}>
                        {category.level > 0 && (
                          <CornerDownRight className="h-4 w-4 text-gray-400 mr-2" />
                        )}
                        {category.name}
                      </div>
                  </TableCell>
                  <TableCell>
                    {categories.filter((c: any) => c.parentId === category.id).length} Sub-kategori
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.isActive ? 'default' : 'secondary'}>
                      {category.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/categories/${category.id}`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Hapus Kategori"
        description="Apakah Anda yakin ingin menghapus kategori ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        variant="destructive"
      />
    </div>

  );
}
