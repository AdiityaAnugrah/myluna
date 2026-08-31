'use client';

import { useState } from 'react';
import { useAuth, useChangePassword } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, AlertTriangle, KeyRound, Lock, UserCircle } from 'lucide-react';
import { formatRole } from '@/lib/utils/format';
import { toast } from 'sonner';
import { FormFieldError, FormValidationSummary, errorInputClass } from '@/components/forms/FormValidationFeedback';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { user } = useAuth();
  const changePasswordResult = useChangePassword();

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const missingFields = [
    !passwords.currentPassword ? 'Kata Sandi Saat Ini' : '',
    passwords.newPassword.length < 6 ? 'Kata Sandi Baru minimal 6 karakter' : '',
    !passwords.confirmPassword ? 'Konfirmasi Kata Sandi Baru' : '',
    passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword ? 'Konfirmasi kata sandi tidak cocok' : '',
  ].filter(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (missingFields.length > 0) {
      toast.error(`Lengkapi dulu: ${missingFields.join(', ')}`);
      return;
    }

    changePasswordResult.mutate({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword
    }, {
      onSuccess: () => {
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSubmitAttempted(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">Profil Saya</h1>
        <p className="text-muted-foreground mt-1">
          Kelola informasi profil dan keamanan akun Anda
        </p>
      </div>
      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 items-start">
        {/* Profile Info Card */}
        <Card className="animate-in [animation-delay:100ms] border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" />
              Informasi Akun
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-sm">
                <User className="h-12 w-12 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{user?.fullName || '-'}</h3>
                <Badge variant="outline" className="mt-1 font-mono text-xs">
                  {formatRole(user?.role || '')}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Username</p>
                  <p className="text-sm text-muted-foreground">{user?.username}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Role Akses</p>
                  <p className="text-sm text-muted-foreground">{formatRole(user?.role || '')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="animate-in [animation-delay:200ms] border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Ubah Kata Sandi
            </CardTitle>
            <CardDescription>
              Perbarui kata sandi Anda secara berkala untuk menjaga keamanan akun.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <FormValidationSummary show={submitAttempted && missingFields.length > 0} fields={missingFields} />
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Kata Sandi Saat Ini</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="password" 
                    id="currentPassword" 
                    name="currentPassword"
                    value={passwords.currentPassword}
                    onChange={handleChange}
                    className={cn('pl-9', submitAttempted && !passwords.currentPassword && errorInputClass)}
                    aria-invalid={submitAttempted && !passwords.currentPassword}
                    
                    placeholder="Masukkan kata sandi saat ini" 
                    required 
                  />
                </div>
                {submitAttempted && !passwords.currentPassword && <FormFieldError message="Isi kata sandi saat ini." />}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Kata Sandi Baru</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="password" 
                    id="newPassword" 
                    name="newPassword"
                    value={passwords.newPassword}
                    onChange={handleChange}
                    className={cn('pl-9', submitAttempted && passwords.newPassword.length < 6 && errorInputClass)}
                    aria-invalid={submitAttempted && passwords.newPassword.length < 6}
                    
                    placeholder="Masukkan kata sandi baru (min. 6 karakter)" 
                    required 
                    minLength={6}
                  />
                </div>
                {submitAttempted && passwords.newPassword.length < 6 && <FormFieldError message="Kata sandi baru minimal 6 karakter." />}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi Baru</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="password" 
                    id="confirmPassword" 
                    name="confirmPassword"
                    value={passwords.confirmPassword}
                    onChange={handleChange}
                    className={cn('pl-9', submitAttempted && (!passwords.confirmPassword || passwords.newPassword !== passwords.confirmPassword) && errorInputClass)}
                    aria-invalid={submitAttempted && (!passwords.confirmPassword || passwords.newPassword !== passwords.confirmPassword)}
                    
                    placeholder="Ketik ulang kata sandi baru" 
                    required 
                    minLength={6}
                  />
                </div>
                {submitAttempted && !passwords.confirmPassword && <FormFieldError message="Isi konfirmasi kata sandi baru." />}
                {submitAttempted && passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && <FormFieldError message="Konfirmasi kata sandi harus sama dengan kata sandi baru." />}
              </div>

              {/* Information Alert */}
              <div className="mt-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3 text-orange-600 dark:text-orange-400">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold mb-1">Lupa Kata Sandi Saat Ini?</p>
                  <p>
                    Apabila Anda lupa kata sandi Anda yang sekarang, Anda <b>wajib melapor</b> dan meminta bantuan kepada Admin atau Super Admin untuk melakukan reset kata sandi pada akun Anda.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 pt-4 border-t flex justify-end">
              <Button type="submit" disabled={changePasswordResult.isPending}>
                {changePasswordResult.isPending ? 'Menyimpan...' : 'Simpan Kata Sandi'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
