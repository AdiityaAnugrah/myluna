'use client';

import { useSupplier } from '@/lib/hooks/useSuppliers';
import { SupplierForm } from '@/components/forms/SupplierForm';
import { useParams } from 'next/navigation';

export default function EditSupplierPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading } = useSupplier(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Supplier not found</p>
      </div>
    );
  }

  return <SupplierForm supplier={data.data} isEdit />;
}
