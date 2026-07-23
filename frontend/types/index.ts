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
  variantItems?: ProductVariant[];
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
  shippingAddressDetail?: string | null;
  shippingProvinceId?: number | null;
  shippingRegencyId?: number | null;
  shippingDistrictId?: number | null;
  shippingVillageId?: number | null;
  shippingPostalCode?: string | null;
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

export type AppRole = 'USER' | 'TCP' | 'ADMIN' | 'SUPER_ADMIN' | 'DEV' | 'TESTING';

export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string | null;
  path: string | null;
  isEnabled: boolean;
  isDevelopment: boolean;
  allowedRoles: AppRole[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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

export interface RegionOption {
  id: number;
  label: string;
  provinceId?: number;
  regencyId?: number;
  districtId?: number;
}

export interface VillageOption extends RegionOption {
  postalCode: string | null;
}

export interface SalesAnalytics {
  period: {
    startDate: string;
    endDate: string;
  };
  regionLevel: 'province' | 'regency' | 'district' | 'village';
  scope: {
    level: 'province' | 'regency' | 'district' | 'village';
    regionId: number;
  } | null;
  summary: {
    totalSales: number;
    totalRevenue: number;
    totalQuantitySold: number;
    averageOrderValue: number;
    totalProductsSold: number;
    totalVariantsSold: number;
    totalRegionsCovered: number;
    totalPlatformsUsed: number;
    mappedSales: number;
    unmappedSales: number;
    mappingCoverage: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantitySold: number;
    orderCount: number;
    revenue: number;
  }>;
  topVariants: Array<{
    productId: string;
    productName: string;
    sku: string;
    variantName: string;
    quantitySold: number;
    orderCount: number;
    revenue: number;
  }>;
  topRegions: Array<{
    regionId: number;
    regionName: string;
    orderCount: number;
    revenue: number;
    quantityPurchased: number;
  }>;
  topPlatforms: Array<{
    platformName: string;
    orderCount: number;
    revenue: number;
    quantitySold: number;
    averageOrderValue: number;
    revenueShare: number;
  }>;
}

export interface UnmappedSalesDiagnostics {
  regionLevel: 'province' | 'regency' | 'district' | 'village';
  total: number;
  shown: number;
  items: Array<{
    id: string;
    saleNumber: string;
    saleDate: string;
    customerName: string | null;
    shippingAddress: string | null;
    shippingPostalCode: string | null;
    postalCode: string | null;
    reason: string;
    candidates: string[];
  }>;
}

export interface OperationalAnalytics {
  period: {
    startDate: string | null;
    endDate: string | null;
  } | null;
  complaints: {
    total: number;
    active: number;
    pendingReview: number;
    acceptedByTcp: number;
    replacementShipped: number;
    completed: number;
    convertedToReturn: number;
    rejected: number;
  };
  returns: {
    total: number;
    active: number;
    pendingReview: number;
    waitingItemReturn: number;
    itemReceived: number;
    restocked: number;
    damaged: number;
    resent: number;
    completed: number;
    rejected: number;
  };
  tickets: {
    total: number;
    active: number;
    open: number;
    inDiscussion: number;
    waitingTcpExecution: number;
    tcpExecuting: number;
    overdue: number;
    completed: number;
    rejected: number;
  };
}

export type ComplaintStatus =
  | 'PENDING_TCP_REVIEW'
  | 'REJECTED_BY_TCP'
  | 'ACCEPTED_BY_TCP'
  | 'REPLACEMENT_SHIPPED'
  | 'WAITING_USER_CONFIRMATION'
  | 'WAITING_USER_DELIVERY_CONFIRMATION'
  | 'MONITORING_CUSTOMER_CONFIRMATION'
  | 'FOLLOW_UP_REQUIRED'
  | 'COMPLETED'
  | 'CONVERTED_TO_RETURN';

export type ComplaintType = 'HARDWARE' | 'ACCESSORY';
export type ComplaintResolutionType = 'SETTLEMENT_DEDUCTION' | 'SEND_COMPONENT' | 'CONVERT_TO_RETURN' | 'NO_ACTION';
export type ComplaintResolutionStatus = 'PENDING_DECISION' | 'IN_PROGRESS' | 'WAITING_USER_CONFIRMATION' | 'COMPLETED';

export interface ComplaintComponentShipment {
  id: string;
  complaintId: string;
  productId: string;
  variantName?: string | null;
  quantity: number;
  notes?: string | null;
  product?: Product;
}

export interface Complaint {
  id: string;
  complaintNumber: string;
  saleId: string;
  saleNumberSnapshot: string;
  customerNameSnapshot: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientAddress?: string | null;
  recipientAddressNote?: string | null;
  reason: string;
  complaintDate: string;
  complaintPhoto: string;
  complaintPhotos?: string[] | null;
  salesInformation?: string | null;
  complaintReceiptPdf?: string | null;
  complaintType?: ComplaintType | null;
  tcpDeadlineAt?: string | null;
  deliveryConfirmDeadlineAt?: string | null;
  deliveredConfirmedAt?: string | null;
  customerCheckDeadlineAt?: string | null;
  caseClosedByUserAt?: string | null;
  status: ComplaintStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  replacementProofDocument: string | null;
  shippedBy: string | null;
  shippedAt: string | null;
  followUpReason?: string | null;
  followUpRequestedAt?: string | null;
  completedBy?: string | null;
  completedAt?: string | null;
  resolutionType?: ComplaintResolutionType | null;
  resolutionStatus?: ComplaintResolutionStatus | null;
  settlementId?: string | null;
  linkedReturnId?: string | null;
  deductionAmount?: string | null;
  netReceivedAmount?: string | null;
  deductionReason?: string | null;
  componentShipmentStatus?: string | null;
  componentShippingService?: string | null;
  componentShippingCost?: string | null;
  resolutionNotes?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  componentShipments?: ComplaintComponentShipment[];
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

export type SaleReturnStatus =
  | 'PENDING_REVIEW'
  | 'WAITING_ITEM_RETURN'
  | 'ITEM_RECEIVED'
  | 'REJECTED'
  | 'RESTOCKED'
  | 'DAMAGED'
  | 'RESENT'
  | 'COMPLETED';

export type SaleReturnDecision = 'RESTOCK' | 'DAMAGED' | 'RESEND';

export type ReturnSourceType = 'DIRECT' | 'COMPLAINT';

export type ReturnInspectionResult = 'GOOD' | 'NOT_GOOD';

export type ReturnFinalOutcome =
  | 'RESTOCK'
  | 'WRITE_OFF'
  | 'REPAIR_AND_RESTOCK'
  | 'RESEND_UNIT'
  | 'SEND_COMPONENT';

export type ReturnTicketStatus =
  | 'OPEN'
  | 'IN_DISCUSSION'
  | 'DECISION_FINALIZED'
  | 'WAITING_TCP_EXECUTION'
  | 'TCP_EXECUTING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'OVERDUE';

export type ReturnFinalDecision = 'RESEND_UNIT' | 'SEND_COMPONENT' | 'RESTOCK';

export type ReturnTicketMessageType = 'TEXT' | 'SYSTEM' | 'DECISION';

export type ReturnExecutionStatus = 'PENDING' | 'STARTED' | 'COMPLETED';

export interface ReturnItem {
  id: string;
  returnId: string;
  saleItemId: string;
  productId: string;
  variantName?: string | null;
  qtySold: number;
  qtyRequested: number;
  qtyReceived?: number | null;
  resolution?: SaleReturnDecision | null;
  replacementProductId?: string | null;
  replacementVariantName?: string | null;
  replacementQty?: number | null;
  inspectionResult?: ReturnInspectionResult | null;
  finalOutcome?: ReturnFinalOutcome | null;
  qtyWrittenOff?: number | null;
  qtyRepaired?: number | null;
  qtyRestocked?: number | null;
  itemNotes?: string | null;
  saleItem?: SaleItem;
  product?: Product;
  replacementProduct?: Product;
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  saleId: string;
  requestedBy: string;
  reviewedBy?: string | null;
  receivedBy?: string | null;
  processedBy?: string | null;
  status: SaleReturnStatus;
  reason: string;
  requestDate: string;
  reviewedAt?: string | null;
  receivedAt?: string | null;
  processedAt?: string | null;
  inspectionDecision?: SaleReturnDecision | null;
  inspectionNotes?: string | null;
  resendShippingService?: string | null;
  resendShippingCost?: string;
  financialImpactAmount?: string;
  evidencePhotos?: string[] | null;
  receivedPhotos?: string[] | null;
  rejectionReason?: string | null;
  sourceType?: ReturnSourceType | null;
  sourceComplaintId?: string | null;
  inspectionResult?: ReturnInspectionResult | null;
  finalOutcome?: ReturnFinalOutcome | null;
  lossAmount?: string | null;
  incomeLostAmount?: string | null;
  repairCost?: string | null;
  repairNotes?: string | null;
  finalOutcomeNotes?: string | null;
  inspectedBy?: string | null;
  inspectedAt?: string | null;
  finalizedBy?: string | null;
  finalizedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sale?: Sale;
  items?: ReturnItem[];
  requester?: {
    id: string;
    fullName: string;
    username: string;
  };
  reviewer?: {
    id: string;
    fullName: string;
    username: string;
  };
  receiver?: {
    id: string;
    fullName: string;
    username: string;
  };
  processor?: {
    id: string;
    fullName: string;
    username: string;
  };
  ticket?: ReturnTicket;
}

export interface ReturnTicketParticipant {
  id: string;
  ticketId: string;
  userId: string;
  roleSnapshot: string;
  lastReadAt?: string | null;
  user?: {
    id: string;
    fullName: string;
    username: string;
  };
}

export interface ReturnTicketMessage {
  id: string;
  ticketId: string;
  senderId?: string | null;
  message: string;
  messageType: ReturnTicketMessageType;
  attachmentUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    fullName: string;
    username: string;
  } | null;
}

export interface ReturnExecution {
  id: string;
  ticketId: string;
  executionType: ReturnFinalDecision;
  status: ReturnExecutionStatus;
  notes?: string | null;
  shippingService?: string | null;
  shippingCost: string;
  expenseAmount: string;
  proofPhotos?: string[] | null;
  executedBy?: string | null;
  executedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  executor?: {
    id: string;
    fullName: string;
    username: string;
  } | null;
}

export interface ReturnTicket {
  id: string;
  ticketNumber: string;
  saleReturnId: string;
  createdBy: string;
  status: ReturnTicketStatus;
  deadlineAt: string;
  finalDecision?: ReturnFinalDecision | null;
  finalDecisionNotes?: string | null;
  finalizedBy?: string | null;
  finalizedAt?: string | null;
  tcpExecutorId?: string | null;
  tcpStartedAt?: string | null;
  tcpCompletedAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    fullName: string;
    username: string;
  };
  finalizer?: {
    id: string;
    fullName: string;
    username: string;
  } | null;
  tcpExecutor?: {
    id: string;
    fullName: string;
    username: string;
  } | null;
  participants?: ReturnTicketParticipant[];
  messages?: ReturnTicketMessage[];
  executions?: ReturnExecution[];
  returnRecord?: SaleReturn;
  unreadCount?: number;
  requiresAction?: boolean;
  actionLabel?: string | null;
}

export interface ReturnTicketListData {
  tickets: ReturnTicket[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ReturnListData {
  returns: SaleReturn[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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

export type DisplayProductStatus = 'DISPLAYED' | 'STORED' | 'MAINTENANCE' | 'DAMAGED' | 'ARCHIVED';
export type DisplayProductCondition = 'NEW' | 'GOOD' | 'MINOR_DAMAGE' | 'DAMAGED';
export type DisplayMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';
export type DisplayRequestType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';
export type DisplayRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type DisplayReturnStatus = 'DRAFT' | 'READY_TO_SEND' | 'SENT' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';

export interface DisplayCategory {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DisplaySupplier {
  id: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DisplayProduct {
  id: string | null;
  productId?: string | null;
  sku: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  supplierId?: string | null;
  displayLocation?: string | null;
  unit: string;
  salesStock?: number;
  stock: number;
  slotLimit?: number;
  displayUsed?: number;
  displayAvailable?: number;
  needsDisplayRequest?: boolean;
  canRequestDisplay?: boolean;
  canReturnDisplay?: boolean;
  isDiscontinued?: boolean;
  minStock: number;
  estimatedValue?: string | null;
  condition: DisplayProductCondition;
  status: DisplayProductStatus;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: DisplayCategory | Category | null;
  supplier?: DisplaySupplier | null;
  sourceProduct?: Product | null;
}

export interface DisplayStockMovement {
  id: string;
  productId: string;
  type: DisplayMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reference?: string | null;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
  product?: DisplayProduct;
  creator?: Pick<User, 'id' | 'fullName' | 'username'>;
}

export interface DisplayStockRequest {
  id: string;
  productId: string;
  type: DisplayRequestType;
  quantity: number;
  targetStock?: number | null;
  reason: string;
  status: DisplayRequestStatus;
  requestedBy: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  product?: DisplayProduct;
  requester?: Pick<User, 'id' | 'fullName' | 'username'>;
  reviewer?: Pick<User, 'id' | 'fullName' | 'username'>;
}

export interface DisplayReturnItem {
  id: string;
  displayReturnId: string;
  displayProductId: string;
  productId: string;
  productVariantId?: string | null;
  skuSnapshot: string;
  productNameSnapshot: string;
  variantSnapshot?: string | null;
  quantity: number;
  condition: string;
  reason: string;
  notes?: string | null;
  product?: Product;
  displayProduct?: DisplayProduct;
  variant?: ProductVariant | null;
}

export interface DisplayReturn {
  id: string;
  letterNumber: string;
  letterSequence: number;
  letterMonth: number;
  letterYear: number;
  letterDate: string;
  recipientName: string;
  recipientAddress: string;
  carriedBy?: string | null;
  status: DisplayReturnStatus;
  notes?: string | null;
  createdBy: string;
  sentBy?: string | null;
  sentAt?: string | null;
  receivedBy?: string | null;
  receivedAt?: string | null;
  completedBy?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: DisplayReturnItem[];
  creator?: Pick<User, 'id' | 'fullName' | 'username'>;
  sender?: Pick<User, 'id' | 'fullName' | 'username'>;
  receiver?: Pick<User, 'id' | 'fullName' | 'username'>;
  completer?: Pick<User, 'id' | 'fullName' | 'username'>;
}
