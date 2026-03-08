import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - WMS',
  description: 'Login to Warehouse Management System',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
