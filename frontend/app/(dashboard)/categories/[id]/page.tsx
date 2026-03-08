'use client';

import { useCategory } from '@/lib/hooks/useCategories';
import { CategoryForm } from '@/components/forms/CategoryForm';
import { useParams } from 'next/navigation';

export default function EditCategoryPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading } = useCategory(id);

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
        <p className="text-gray-500">Category not found</p>
      </div>
    );
  }

  return <CategoryForm category={data.data} isEdit />;
}
