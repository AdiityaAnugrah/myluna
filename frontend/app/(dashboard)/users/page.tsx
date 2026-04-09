'use client';

import { useState } from 'react';
import { useUsers, useDeleteUser } from '@/lib/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Search, Loader2, Activity } from 'lucide-react';
import { UserForm } from './components/UserForm';
import { UserActivityModal } from './components/UserActivityModal';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

function formatDuration(seconds: number) {
  if (!seconds) return '0j 0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}j ${m}m`;
}

function getActivityStatus(lastActivityAt?: string | null) {
  if (!lastActivityAt) return { label: 'Inaktif', variant: 'outline' as const };
  const lastActivity = new Date(lastActivityAt).getTime();
  const diff = Date.now() - lastActivity;
  if (diff < 2 * 60 * 1000) return { label: 'Aktif', variant: 'default' as const, className: 'bg-green-500' };
  if (diff < 10 * 60 * 1000) return { label: 'Standby', variant: 'secondary' as const };
  return { label: 'AFK', variant: 'destructive' as const };
}


export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityUser, setActivityUser] = useState<{ id: string; name: string } | null>(null);


  // Redirect if not Super Admin (Frontend check mainly for UX, backend protects mostly)
  // if (currentUser && currentUser.roleName !== 'SUPER_ADMIN') {
  //   router.push('/');
  //   return null; 
  // } 
  // Handled by API error mostly, but good to have safety.

  const { data, isLoading } = useUsers({ page, limit: 10, search });
  const deleteMutation = useDeleteUser();

  const handleDelete = (id: string) => {
    setUserToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      await deleteMutation.mutateAsync(userToDelete);
      setUserToDelete(null);
    }
  };


  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedUser(undefined);
    setIsFormOpen(true);
  };

  const handleViewActivity = (user: User) => {
    setActivityUser({ id: user.id, name: user.fullName });
    setActivityModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Pengguna</h1>
          <p className="text-muted-foreground mt-1">Kelola akses dan peran pengguna sistem.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="flex items-center gap-4 animate-in [animation-delay:100ms]">
        <div className="relative flex-1 max-w-sm group">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Cari pengguna..."
            className="pl-9 bg-card border-border/50 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden animate-in [animation-delay:200ms]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Memuat data...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : !data?.data?.users || data.data.users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Search className="h-10 w-10 mx-auto opacity-20 mb-2" />
                  <p>Tidak ada pengguna ditemukan.</p>
                </TableCell>
              </TableRow>
            ) : (
              data?.data?.users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role?.name}</Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const status = getActivityStatus(user.lastActivityAt);
                      return (
                        <div className="flex flex-col gap-1">
                          <Badge variant={status.variant} className={(status as any).className}>
                            {status.label}
                          </Badge>
                          {user.lastActivityAt && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(user.lastActivityAt), { addSuffix: true, locale: id })}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatDuration(user.totalDuration || 0)}
                  </TableCell>
                  <TableCell>
                     <Badge variant={user.isActive ? "default" : "destructive"}>
                        {user.isActive ? 'Active' : 'Inactive'}
                     </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewActivity(user)}>
                          <Activity className="mr-2 h-4 w-4 text-primary" />
                          Lihat Aktivitas
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 focus:text-red-600"
                            disabled={user.id === currentUser?.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        user={selectedUser} 
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />

      <UserActivityModal
        open={activityModalOpen}
        onOpenChange={setActivityModalOpen}
        userId={activityUser?.id}
        userName={activityUser?.name}
      />
    </div>

  );
}
