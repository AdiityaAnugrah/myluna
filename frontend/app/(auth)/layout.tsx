import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Lunarea',
  description: 'Login ke Sistem Manajemen Lunarea',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
