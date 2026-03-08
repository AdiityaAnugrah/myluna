'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateUser, useUpdateUser } from '@/lib/hooks/useUsers';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

import { userSchema, userUpdateSchema, UserFormData, UserUpdateFormData } from '@/lib/validations/schemas';
// ... imports

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
}

export function UserForm({ open, onOpenChange, user }: UserFormProps) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Use correct schema based on mode
  const schema = user ? userUpdateSchema : userSchema;

  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      fullName: '',
      roleId: '',
    },
  });

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data } = await api.get('/users/roles');
        if (data && data.data) {
           setRoles(data.data);
        }
      } catch (e) {
        console.error('Failed to fetch roles', e);
        toast.error('Failed to load roles');
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        email: user.email,
        password: '', // Don't fill password
        fullName: user.fullName,
        roleId: user.roleId,
      });
    } else {
      form.reset({
        username: '',
        email: '',
        password: '',
        fullName: '',
        roleId: '',
      });
    }
  }, [user, form]);


  const onSubmit = async (values: UserFormData | UserUpdateFormData) => {
    try {
      if (user) {
        if (!values.password) delete values.password;
        await updateUser.mutateAsync({ id: user.id, data: values });
        toast.success('Pengguna berhasil diperbarui');
      } else {
        if (!values.password) {
            form.setError('password', { message: 'Kata sandi wajib diisi untuk pengguna baru' });
            return;
        }
        await createUser.mutateAsync(values as any);
        toast.success('Pengguna berhasil dibuat');
      }
      onOpenChange(false);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Terjadi kesalahan';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit Pengguna' : 'Tambah Pengguna'}</DialogTitle>
          <DialogDescription>
            {user ? 'Perbarui detail pengguna.' : 'Tambahkan pengguna baru ke sistem.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="johndoe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{user ? 'Kata Sandi (kosongkan jika tidak diubah)' : 'Kata Sandi'}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="******" 
                        {...field} 
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="sr-only">Lihat kata sandi</span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {/* Role select will go here once we have roles */}
             <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Peran (Role)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Peran" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
                {(createUser.isPending || updateUser.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
