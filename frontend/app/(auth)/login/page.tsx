'use client';


import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '@/lib/hooks/useAuth';
import { loginSchema, LoginFormData } from '@/lib/validations/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Logo } from '@/components/ui/logo';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useLogin();

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden" suppressHydrationWarning>
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px] animate-pulse" />

      <Card className="w-full max-w-md glass border-white/10 shadow-2xl animate-in" suppressHydrationWarning>
        <CardHeader className="space-y-6 pb-8" suppressHydrationWarning>
          <div className="flex justify-center pt-2">
            <Logo size="xl" />
          </div>
          <CardDescription className="text-center text-base" suppressHydrationWarning>
            Masuk ke akun Anda untuk melanjutkan.
          </CardDescription>
        </CardHeader>
        <CardContent suppressHydrationWarning>
          {loginMutation.isError && (
            <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/20 text-destructive animate-in">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {loginMutation.error?.response?.data?.message === 'Invalid credentials' 
                  ? 'Email/Username atau Kata Sandi salah' 
                  : (loginMutation.error?.response?.data?.message || 'Gagal masuk ke sistem')}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" suppressHydrationWarning>
            <div className="space-y-2" suppressHydrationWarning>
              <Label htmlFor="credential">Email / Username</Label>
              <Input
                id="credential"
                type="text"
                placeholder="Masukkan Email atau Username"
                className="bg-background/50 border-white/10"
                {...register('credential')}
                disabled={loginMutation.isPending}
              />
              {errors.credential && (
                <p className="text-xs font-medium text-destructive mt-1">{errors.credential.message}</p>
              )}
            </div>

            <div className="space-y-2" suppressHydrationWarning>
              <Label htmlFor="password">Kata Sandi</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan Kata Sandi"
                  className="bg-background/50 border-white/10 pr-10"
                  {...register('password')}
                  disabled={loginMutation.isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">Toggle password visibility</span>
                </Button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all border-none"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
