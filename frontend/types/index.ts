export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string;
  imageUrl: string | null;
  length: string | null;
  width: string | null;
  height: string | null;
  weight: string | null;
  unit: string;
  purchasePrice: string;
  sellingPrice: string;
  warrantyPrice?: string | null;
  stock: number;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    parentId?: string | null;
    parent?: {
      id: string;
      name: string;
    };
  };
  variants?: ProductVariant[];
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
  parent?: Category;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  value: string;
  priceAdjustment: string;
  stock: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  purchaseDate: string;
  totalAmount: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  variantName?: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  product?: Product;
}

export type SalePlatform = string;

export type SaleStatus = 
  | 'WAITING_APPROVAL' 
  | 'APPROVED' 
  | 'PROCESSED' 
  | 'SETTLED'
  | 'REJECTED'
  | 'PENDING' 
  | 'COMPLETED' 
  | 'CANCELLED';

export interface Sale {
  id: string;
  saleNumber: string;
  saleDate: string;
  customerName: string | null;
  customerPhone: string | null;
  paymentMethod: 'CASH' | 'TRANSFER' | 'CREDIT';
  platform: SalePlatform;
  totalAmount: string;
  status: SaleStatus;
  notes: string | null;
  shippingService?: string | null;
  shippingAddress?: string | null;
  shippingDocument?: string | null;
  processedAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isCancelPending?: boolean;
  items?: SaleItem[];
  creator?: User;
  settlement?: Settlement;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  price: string;
  discount: string;
  subtotal: string;
  variantName?: string | null;
  variants?: string;
  priceType?: 'regular' | 'warranty';
  product?: Product;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reference: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  product?: Product;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    products?: T[];
    categories?: T[];
    suppliers?: T[];
    purchases?: T[];
    sales?: T[];
    users?: T[];
    movements?: T[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface ProductStatusRequest {
  id: string;
  productId: string;
  requestedStatus: 'ACTIVE' | 'PASSIVE';
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  processedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

export interface SaleReturnRequest {
  id: string;
  saleId: string;
  type: 'RETURN' | 'EXCHANGE';
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  processedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  sale?: Sale;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roleId: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  lastActivityAt?: string | null;
  totalDuration?: number;
  role?: Role;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeRequest {
  id: string;
  entityType: 'PRODUCT' | 'CATEGORY' | 'SUPPLIER' | 'STOCK' | 'SETTLEMENT' | 'SALE';
  entityId: string | null;
  requestType: 'CREATE' | 'UPDATE' | 'DELETE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  payload: Record<string, unknown>;
  requestedBy: string;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: User;
  reviewer?: User;
}

export interface Settlement {
  id: string;
  saleId: string;
  netAmount: string;
  settlementDate: string;
  proofDocument: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sale?: Sale;
  creator?: User;
}

export type ComplaintStatus =
  | 'PENDING_TCP_REVIEW'
  | 'REJECTED_BY_TCP'
  | 'ACCEPTED_BY_TCP'
  | 'REPLACEMENT_SHIPPED';

export interface Complaint {
  id: string;
  complaintNumber: string;
  saleId: string;
  saleNumberSnapshot: string;
  customerNameSnapshot: string | null;
  reason: string;
  complaintDate: string;
  complaintPhoto: string;
  complaintPhotos?: string[] | null;
  salesInformation?: string | null;
  complaintReceiptPdf?: string | null;
  complaintVideo?: string | null;
  complaintVideoOriginalSize?: number | null;
  complaintVideoCompressedSize?: number | null;
  status: ComplaintStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  replacementProofDocument: string | null;
  shippedBy: string | null;
  shippedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sale?: Sale & {
    creator?: {
      id: string;
      fullName: string;
      username: string;
    };
  };
  creator?: {
    id: string;
    fullName: string;
    username: string;
  };
  reviewer?: {
    id: string;
    fullName: string;
    username: string;
  };
  shipper?: {
    id: string;
    fullName: string;
    username: string;
  };
}

export interface ComplaintListData {
  complaints: Complaint[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ComplaintVideoMetadata {
  complaintId: string;
  complaintNumber: string;
  videoPath: string;
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  savedPercent: number;
}

export interface PaginatedListResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
