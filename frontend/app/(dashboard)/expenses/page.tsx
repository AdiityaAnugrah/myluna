'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/lib/hooks/useExpense';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2, DollarSign, Calendar, Filter } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getTodayDateInputValue, getUserTodayDateInputProps } from '@/lib/utils/dateGuard';
import { FormFieldError, FormValidationSummary, errorInputClass, errorSelectClass } from '@/components/forms/FormValidationFeedback';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const EXPENSE_CATEGORIES = [
  { value: 'SHIPPING', label: 'Ongkir', color: 'bg-blue-100 text-blue-800' },
  { value: 'SALARY', label: 'Gaji', color: 'bg-green-100 text-green-800' },
  { value: 'RENT', label: 'Sewa', color: 'bg-purple-100 text-purple-800' },
  { value: 'UTILITIES', label: 'Listrik & Air', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'ADMIN', label: 'Admin & Bank', color: 'bg-orange-100 text-orange-800' },
  { value: 'OTHER', label: 'Lain-lain', color: 'bg-gray-100 text-gray-800' },
];

export default function ExpensesPage() {
  const { user } = useAuth();
  const isUser = user?.role === 'USER';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    expenseDate: '',
    notes: '',
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading, refetch } = useExpenses({
    page,
    limit,
    category: categoryFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const expenses = (data as any)?.data?.expenses || [];
  const pagination = (data as any)?.data?.pagination || {
    total: 0,
    page,
    limit,
    totalPages: 1,
  };

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, startDate, endDate, limit]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getCategoryLabel = (category: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const getCategoryColor = (category: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === category)?.color || 'bg-gray-100 text-gray-800';
  };

  const handleOpenDialog = (expense?: any) => {
    if (expense) {
      setSelectedExpense(expense);
      setFormData({
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        expenseDate: isUser ? getTodayDateInputValue() : expense.expenseDate,
        notes: expense.notes || '',
      });
    } else {
      setSelectedExpense(null);
      setFormData({
        category: '',
        description: '',
        amount: '',
        expenseDate: getTodayDateInputValue(),
        notes: '',
      });
    }
    setSubmitAttempted(false);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedExpense(null);
    setSubmitAttempted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const formErrors = [
      ...(!formData.category ? ['Kategori'] : []),
      ...(!formData.description.trim() ? ['Deskripsi'] : []),
      ...(!formData.amount || !Number.isFinite(Number(formData.amount)) || Number(formData.amount) <= 0 ? ['Jumlah'] : []),
      ...(!(isUser ? getTodayDateInputValue() : formData.expenseDate) ? ['Tanggal'] : []),
    ];

    if (formErrors.length > 0) {
      toast.error(`Lengkapi dulu: ${formErrors.join(', ')}`);
      return;
    }

    const submitData = {
      ...formData,
      expenseDate: isUser ? getTodayDateInputValue() : formData.expenseDate,
      amount: parseFloat(formData.amount),
    };

    if (selectedExpense) {
      await updateMutation.mutateAsync({
        id: selectedExpense.id,
        data: submitData,
      });
    } else {
      await createMutation.mutateAsync(submitData);
    }

    handleCloseDialog();
  };

  const handleDelete = async () => {
    if (selectedExpense) {
      await deleteMutation.mutateAsync(selectedExpense.id);
      setIsDeleteDialogOpen(false);
      setSelectedExpense(null);
    }
  };

  const handleApplyFilter = () => {
    setPage(1);
    refetch();
  };

  const handleResetFilter = () => {
    setCategoryFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Check authorization
  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'DEV')) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold">Akses Ditolak</h3>
          <p className="text-gray-600">Hanya Super Admin dan Admin yang dapat mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Biaya Operasional', href: '/expenses' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Biaya Operasional</h1>
          <p className="text-gray-600 mt-1">Kelola biaya operasional (ongkir, gaji, sewa, dll)</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Biaya
        </Button>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="categoryFilter">Kategori</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="categoryFilter">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Tanggal Mulai</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Tanggal Akhir</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleApplyFilter} className="flex-1">Terapkan</Button>
              <Button onClick={handleResetFilter} variant="outline">Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Biaya Operasional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="text-gray-500 mt-2">Memuat data...</p>
                    </TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Belum ada data biaya operasional
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense: any) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {new Date(expense.expenseDate).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                          {getCategoryLabel(expense.category)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate">{expense.description}</div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(parseFloat(expense.amount))}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate text-gray-500 text-sm">
                          {expense.notes || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(expense)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {(user?.role === 'SUPER_ADMIN' || user?.role === 'DEV') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!isLoading && expenses.length > 0 && (
            <Pagination
              currentPage={Number(pagination.page || page)}
              totalPages={Number(pagination.totalPages || 1)}
              totalItems={Number(pagination.total || 0)}
              itemsPerPage={Number(pagination.limit || limit)}
              onPageChange={setPage}
              onItemsPerPageChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedExpense ? 'Edit Biaya Operasional' : 'Tambah Biaya Operasional'}
            </DialogTitle>
            <DialogDescription>
              Isi form di bawah untuk {selectedExpense ? 'mengupdate' : 'menambahkan'} biaya operasional
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormValidationSummary
              show={submitAttempted}
              fields={[
                ...(!formData.category ? ['Kategori'] : []),
                ...(!formData.description.trim() ? ['Deskripsi'] : []),
                ...(!formData.amount || !Number.isFinite(Number(formData.amount)) || Number(formData.amount) <= 0 ? ['Jumlah'] : []),
                ...(!(isUser ? getTodayDateInputValue() : formData.expenseDate) ? ['Tanggal'] : []),
              ]}
            />
            <div>
              <Label htmlFor="category">Kategori *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                required
              >
                <SelectTrigger id="category" className={cn(submitAttempted && !formData.category && errorSelectClass)}>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormFieldError message={submitAttempted && !formData.category ? 'Kategori wajib dipilih.' : undefined} />
            </div>

            <div>
              <Label htmlFor="description">Deskripsi *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Contoh: Kirim barang ke Jakarta"
                required
                aria-invalid={submitAttempted && !formData.description.trim() ? true : undefined}
                className={cn(submitAttempted && !formData.description.trim() && errorInputClass)}
              />
              <FormFieldError message={submitAttempted && !formData.description.trim() ? 'Deskripsi wajib diisi.' : undefined} />
            </div>

            <div>
              <Label htmlFor="amount">Jumlah *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                required
                aria-invalid={submitAttempted && (!formData.amount || !Number.isFinite(Number(formData.amount)) || Number(formData.amount) <= 0) ? true : undefined}
                className={cn(submitAttempted && (!formData.amount || !Number.isFinite(Number(formData.amount)) || Number(formData.amount) <= 0) && errorInputClass)}
              />
              <FormFieldError message={submitAttempted && (!formData.amount || !Number.isFinite(Number(formData.amount)) || Number(formData.amount) <= 0) ? 'Jumlah harus lebih dari 0.' : undefined} />
            </div>

            <div>
              <Label htmlFor="expenseDate">Tanggal *</Label>
              <Input
                id="expenseDate"
                type="date"
                value={isUser ? getTodayDateInputValue() : formData.expenseDate}
                onChange={(e) => {
                  if (!isUser) setFormData({ ...formData, expenseDate: e.target.value });
                }}
                {...getUserTodayDateInputProps(isUser)}
                required
                aria-invalid={submitAttempted && !(isUser ? getTodayDateInputValue() : formData.expenseDate) ? true : undefined}
                className={cn(submitAttempted && !(isUser ? getTodayDateInputValue() : formData.expenseDate) && errorInputClass)}
              />
              <FormFieldError message={submitAttempted && !(isUser ? getTodayDateInputValue() : formData.expenseDate) ? 'Tanggal wajib diisi.' : undefined} />
            </div>

            <div>
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Catatan tambahan..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus biaya operasional ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
