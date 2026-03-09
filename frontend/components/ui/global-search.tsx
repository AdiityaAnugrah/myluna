'use client';

import { Search, X, Package, ShoppingBag } from 'lucide-react';
import { Input } from './input';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './button';
import { Card } from './card';
import axios from 'axios';
import { useAuthStore } from '@/lib/stores/auth';

interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  sellingPrice: string;
  unit: string;
  category?: { name: string };
}

interface Sale {
  id: string;
  saleNumber: string;
  customerName: string | null;
  totalAmount: string;
  status: string;
  saleDate: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { accessToken } = useAuthStore();

  // Focus search on "/" key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const handleSearch = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (searchQuery: string) => {
        clearTimeout(timer);
        if (searchQuery.trim().length < 2) {
          setProducts([]);
          setSales([]);
          return;
        }
        setIsLoading(true);
        timer = setTimeout(async () => {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
            const { data } = await axios.get(`${apiUrl}/search`, {
              params: { q: searchQuery },
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            setProducts(data.data?.products || []);
            setSales(data.data?.sales || []);
          } catch {
            setProducts([]);
            setSales([]);
          } finally {
            setIsLoading(false);
          }
        }, 300);
      };
    })(),
    [accessToken]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    handleSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    setProducts([]);
    setSales([]);
    inputRef.current?.focus();
  };

  const handleSelectProduct = (product: Product) => {
    router.push(`/products/${product.id}`);
    setQuery('');
    setIsOpen(false);
  };

  const handleSelectSale = (sale: Sale) => {
    router.push(`/sales/${sale.id}`);
    setQuery('');
    setIsOpen(false);
  };

  const hasResults = products.length > 0 || sales.length > 0;
  const showDropdown = isOpen && query.trim().length >= 2;

  const formatCurrency = (value: string) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(parseFloat(value));

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Cari produk, penjualan... (tekan /)"
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showDropdown && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto z-50 shadow-lg">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Mencari...</div>
          ) : !hasResults ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Tidak ada hasil ditemukan</div>
          ) : (
            <div className="py-2">
              {/* Products */}
              {products.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Package className="h-3 w-3" /> Produk
                  </div>
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        <span>SKU: {product.sku}</span>
                        <span>·</span>
                        <span>Stok: {product.stock} {product.unit}</span>
                        <span>·</span>
                        <span>{formatCurrency(product.sellingPrice)}</span>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Sales */}
              {sales.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mt-1 border-t">
                    <ShoppingBag className="h-3 w-3" /> Penjualan
                  </div>
                  {sales.map((sale) => (
                    <button
                      key={sale.id}
                      onClick={() => handleSelectSale(sale)}
                      className="w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-medium text-sm">{sale.saleNumber}</div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        <span>{sale.customerName || 'Pelanggan Umum'}</span>
                        <span>·</span>
                        <span>{formatCurrency(sale.totalAmount)}</span>
                        <span>·</span>
                        <span className="capitalize">{sale.status.toLowerCase()}</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
