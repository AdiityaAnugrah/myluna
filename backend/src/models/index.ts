import Role from './Role';
import User from './User';
import RefreshToken from './RefreshToken';
import AuditLog, { AuditAction } from './AuditLog';
import Category from './Category';
import Supplier from './Supplier';
import Product from './Product';
import StockMovement, { MovementType } from './StockMovement';
import Purchase, { PurchaseStatus } from './Purchase';
import PurchaseItem from './PurchaseItem';
import Sale, { SaleStatus, PaymentMethod } from './Sale';
import SaleItem from './SaleItem';

import ProductStatusRequest, { ProductStatus } from './ProductStatusRequest';
import SaleReturnRequest, { ReturnType } from './SaleReturnRequest';
import { Platform } from './Platform';
import ProductVariant from './ProductVariant';
import { ChangeRequest, EntityType, RequestType, RequestStatus } from './ChangeRequest';
import Settlement from './Settlement';
import Expense from './Expense';
import ShippingService from './ShippingService';
import OtherIncome from './OtherIncome';
import HistoricalSettlement from './HistoricalSettlement';
import VariantOption from './VariantOption';
import Complaint, {
  ComplaintResolutionStatus,
  ComplaintResolutionType,
  ComplaintStatus,
} from './Complaint';
import ComplaintComponentShipment from './ComplaintComponentShipment';
import Province from './Province';
import Regency from './Regency';
import District from './District';
import Village from './Village';
import SaleReturn, {
  ReturnFinalOutcome as SaleReturnFinalOutcome,
  ReturnInspectionResult,
  ReturnSourceType,
  SaleReturnDecision,
  SaleReturnStatus,
} from './SaleReturn';
import SaleReturnItem from './SaleReturnItem';
import ReturnTicket, { ReturnFinalDecision, ReturnTicketStatus } from './ReturnTicket';
import ReturnTicketParticipant from './ReturnTicketParticipant';
import ReturnTicketMessage, { ReturnTicketMessageType } from './ReturnTicketMessage';
import ReturnExecution, { ReturnExecutionStatus } from './ReturnExecution';
import DisplayCategory from './DisplayCategory';
import DisplaySupplier from './DisplaySupplier';
import DisplayProduct, { DisplayProductCondition, DisplayProductStatus } from './DisplayProduct';
import DisplayStockMovement, { DisplayMovementType } from './DisplayStockMovement';
import DisplayStockRequest, { DisplayRequestStatus, DisplayRequestType } from './DisplayStockRequest';
import DisplayReturn, { DisplayReturnStatus } from './DisplayReturn';
import DisplayReturnItem from './DisplayReturnItem';
import FeatureFlag from './FeatureFlag';

// Define associations
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Categories hierarchical association
Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });
Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' });

Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });

// Product Variants association
Product.hasMany(ProductVariant, { foreignKey: 'productId', as: 'variantItems' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Product.hasMany(StockMovement, { foreignKey: 'productId', as: 'stockMovements' });
StockMovement.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

User.hasMany(StockMovement, { foreignKey: 'createdBy', as: 'createdStockMovements' });
StockMovement.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Purchase.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
Supplier.hasMany(Purchase, { foreignKey: 'supplierId', as: 'purchases' });

Purchase.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(Purchase, { foreignKey: 'createdBy', as: 'createdPurchases' });

Purchase.hasMany(PurchaseItem, { foreignKey: 'purchaseId', as: 'items' });
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchaseId', as: 'purchase' });

PurchaseItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(PurchaseItem, { foreignKey: 'productId', as: 'purchaseItems' });

Sale.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(Sale, { foreignKey: 'createdBy', as: 'createdSales' });

Sale.hasMany(SaleItem, { foreignKey: 'saleId', as: 'items' });
SaleItem.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });

SaleItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(SaleItem, { foreignKey: 'productId', as: 'saleItems' });

// Product Status Requests Associations
ProductStatusRequest.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(ProductStatusRequest, { foreignKey: 'productId', as: 'statusRequests' });

ProductStatusRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
User.hasMany(ProductStatusRequest, { foreignKey: 'requestedBy', as: 'productStatusRequests' });

ProductStatusRequest.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });
User.hasMany(ProductStatusRequest, { foreignKey: 'processedBy', as: 'processedProductRequests' });

// Sale Return Requests Associations
SaleReturnRequest.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });
Sale.hasMany(SaleReturnRequest, { foreignKey: 'saleId', as: 'returnRequests' });

SaleReturnRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
User.hasMany(SaleReturnRequest, { foreignKey: 'requestedBy', as: 'saleReturnRequests' });

SaleReturnRequest.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });
User.hasMany(SaleReturnRequest, { foreignKey: 'processedBy', as: 'processedSaleRequests' });

// Settlement Associations
Settlement.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });
Sale.hasOne(Settlement, { foreignKey: 'saleId', as: 'settlement' });

Settlement.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(Settlement, { foreignKey: 'createdBy', as: 'settlements'});

Settlement.belongsTo(Complaint, { foreignKey: 'complaintId', as: 'complaint' });
Complaint.hasOne(Settlement, { foreignKey: 'complaintId', as: 'complaintSettlement' });

// Expense Associations
Expense.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(Expense, { foreignKey: 'createdBy', as: 'expenses' });

// OtherIncome Associations
OtherIncome.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(OtherIncome, { foreignKey: 'createdBy', as: 'otherIncomes' });

// Complaint Associations
Complaint.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });
Sale.hasMany(Complaint, { foreignKey: 'saleId', as: 'complaints' });

Complaint.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(Complaint, { foreignKey: 'createdBy', as: 'complaints' });

Complaint.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });
User.hasMany(Complaint, { foreignKey: 'reviewedBy', as: 'reviewedComplaints' });

Complaint.belongsTo(User, { foreignKey: 'shippedBy', as: 'shipper' });
User.hasMany(Complaint, { foreignKey: 'shippedBy', as: 'shippedComplaints' });

Complaint.belongsTo(User, { foreignKey: 'completedBy', as: 'completer' });
User.hasMany(Complaint, { foreignKey: 'completedBy', as: 'completedComplaints' });

Complaint.hasMany(ComplaintComponentShipment, { foreignKey: 'complaintId', as: 'componentShipments' });
ComplaintComponentShipment.belongsTo(Complaint, { foreignKey: 'complaintId', as: 'complaint' });
ComplaintComponentShipment.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(ComplaintComponentShipment, { foreignKey: 'productId', as: 'complaintComponentShipments' });
ComplaintComponentShipment.belongsTo(StockMovement, { foreignKey: 'stockMovementId', as: 'stockMovement' });
StockMovement.hasOne(ComplaintComponentShipment, { foreignKey: 'stockMovementId', as: 'complaintComponentShipment' });
ComplaintComponentShipment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(ComplaintComponentShipment, { foreignKey: 'createdBy', as: 'createdComplaintComponentShipments' });

// Indonesian administrative regions
Province.hasMany(Regency, { foreignKey: 'provinceId', as: 'regencies' });
Regency.belongsTo(Province, { foreignKey: 'provinceId', as: 'province' });

Province.hasMany(District, { foreignKey: 'provinceId', as: 'districts' });
District.belongsTo(Province, { foreignKey: 'provinceId', as: 'province' });
Regency.hasMany(District, { foreignKey: 'regencyId', as: 'districts' });
District.belongsTo(Regency, { foreignKey: 'regencyId', as: 'regency' });

Province.hasMany(Village, { foreignKey: 'provinceId', as: 'villages' });
Village.belongsTo(Province, { foreignKey: 'provinceId', as: 'province' });
Regency.hasMany(Village, { foreignKey: 'regencyId', as: 'villages' });
Village.belongsTo(Regency, { foreignKey: 'regencyId', as: 'regency' });
District.hasMany(Village, { foreignKey: 'districtId', as: 'villages' });
Village.belongsTo(District, { foreignKey: 'districtId', as: 'district' });

Sale.belongsTo(Province, { foreignKey: 'shippingProvinceId', as: 'shippingProvince' });
Sale.belongsTo(Regency, { foreignKey: 'shippingRegencyId', as: 'shippingRegency' });
Sale.belongsTo(District, { foreignKey: 'shippingDistrictId', as: 'shippingDistrict' });
Sale.belongsTo(Village, { foreignKey: 'shippingVillageId', as: 'shippingVillage' });

// Return associations
SaleReturn.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });
Sale.hasMany(SaleReturn, { foreignKey: 'saleId', as: 'returns' });

SaleReturn.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
User.hasMany(SaleReturn, { foreignKey: 'requestedBy', as: 'requestedReturns' });

SaleReturn.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });
User.hasMany(SaleReturn, { foreignKey: 'reviewedBy', as: 'reviewedReturns' });

SaleReturn.belongsTo(User, { foreignKey: 'receivedBy', as: 'receiver' });
User.hasMany(SaleReturn, { foreignKey: 'receivedBy', as: 'receivedReturns' });

SaleReturn.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });
User.hasMany(SaleReturn, { foreignKey: 'processedBy', as: 'processedReturns' });

SaleReturn.hasMany(SaleReturnItem, { foreignKey: 'returnId', as: 'items' });
SaleReturnItem.belongsTo(SaleReturn, { foreignKey: 'returnId', as: 'returnRecord' });

SaleReturnItem.belongsTo(SaleItem, { foreignKey: 'saleItemId', as: 'saleItem' });
SaleItem.hasMany(SaleReturnItem, { foreignKey: 'saleItemId', as: 'returnItems' });

SaleReturnItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(SaleReturnItem, { foreignKey: 'productId', as: 'saleReturnItems' });

SaleReturnItem.belongsTo(Product, { foreignKey: 'replacementProductId', as: 'replacementProduct' });

ReturnTicket.belongsTo(SaleReturn, { foreignKey: 'saleReturnId', as: 'returnRecord' });
SaleReturn.hasOne(ReturnTicket, { foreignKey: 'saleReturnId', as: 'ticket' });

ReturnTicket.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(ReturnTicket, { foreignKey: 'createdBy', as: 'createdReturnTickets' });

ReturnTicket.belongsTo(User, { foreignKey: 'finalizedBy', as: 'finalizer' });
User.hasMany(ReturnTicket, { foreignKey: 'finalizedBy', as: 'finalizedReturnTickets' });

ReturnTicket.belongsTo(User, { foreignKey: 'tcpExecutorId', as: 'tcpExecutor' });
User.hasMany(ReturnTicket, { foreignKey: 'tcpExecutorId', as: 'tcpAssignedReturnTickets' });

ReturnTicket.hasMany(ReturnTicketParticipant, { foreignKey: 'ticketId', as: 'participants' });
ReturnTicketParticipant.belongsTo(ReturnTicket, { foreignKey: 'ticketId', as: 'ticket' });
ReturnTicketParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(ReturnTicketParticipant, { foreignKey: 'userId', as: 'returnTicketParticipants' });

ReturnTicket.hasMany(ReturnTicketMessage, { foreignKey: 'ticketId', as: 'messages' });
ReturnTicketMessage.belongsTo(ReturnTicket, { foreignKey: 'ticketId', as: 'ticket' });
ReturnTicketMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
User.hasMany(ReturnTicketMessage, { foreignKey: 'senderId', as: 'returnTicketMessages' });

ReturnTicket.hasMany(ReturnExecution, { foreignKey: 'ticketId', as: 'executions' });
ReturnExecution.belongsTo(ReturnTicket, { foreignKey: 'ticketId', as: 'ticket' });
ReturnExecution.belongsTo(User, { foreignKey: 'executedBy', as: 'executor' });
User.hasMany(ReturnExecution, { foreignKey: 'executedBy', as: 'returnExecutions' });

// Display system associations - isolated from sales, finance, and operational stock
DisplayProduct.belongsTo(Product, { foreignKey: 'productId', as: 'sourceProduct' });
Product.hasOne(DisplayProduct, { foreignKey: 'productId', as: 'displaySlot' });
DisplayProduct.belongsTo(DisplayCategory, { foreignKey: 'categoryId', as: 'category' });
DisplayCategory.hasMany(DisplayProduct, { foreignKey: 'categoryId', as: 'products' });
DisplayProduct.belongsTo(DisplaySupplier, { foreignKey: 'supplierId', as: 'supplier' });
DisplaySupplier.hasMany(DisplayProduct, { foreignKey: 'supplierId', as: 'products' });
DisplayProduct.hasMany(DisplayStockMovement, { foreignKey: 'productId', as: 'movements' });
DisplayStockMovement.belongsTo(DisplayProduct, { foreignKey: 'productId', as: 'product' });
DisplayStockMovement.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
DisplayProduct.hasMany(DisplayStockRequest, { foreignKey: 'productId', as: 'requests' });
DisplayStockRequest.belongsTo(DisplayProduct, { foreignKey: 'productId', as: 'product' });
DisplayStockRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
DisplayStockRequest.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });
DisplayReturn.hasMany(DisplayReturnItem, { foreignKey: 'displayReturnId', as: 'items' });
DisplayReturnItem.belongsTo(DisplayReturn, { foreignKey: 'displayReturnId', as: 'displayReturn' });
DisplayReturnItem.belongsTo(DisplayProduct, { foreignKey: 'displayProductId', as: 'displayProduct' });
DisplayReturnItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
DisplayReturnItem.belongsTo(ProductVariant, { foreignKey: 'productVariantId', as: 'variant' });
DisplayReturn.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
DisplayReturn.belongsTo(User, { foreignKey: 'sentBy', as: 'sender' });
DisplayReturn.belongsTo(User, { foreignKey: 'receivedBy', as: 'receiver' });
DisplayReturn.belongsTo(User, { foreignKey: 'completedBy', as: 'completer' });

export {
  Role,
  User,
  RefreshToken,
  AuditLog,
  AuditAction,
  Category,
  Supplier,
  Product,
  StockMovement,
  MovementType,
  Purchase,
  PurchaseStatus,
  PurchaseItem,
  Sale,
  SaleStatus,
  PaymentMethod,
  SaleItem,
  ProductStatusRequest,
  ProductStatus,
  SaleReturnRequest,
  ReturnType,
  Platform,
  ProductVariant,
  ChangeRequest,
  EntityType,
  RequestType,
  RequestStatus,
  Settlement,
  Expense,
  ShippingService,
  OtherIncome,
  HistoricalSettlement,
  VariantOption,
  Complaint,
  ComplaintStatus,
  ComplaintResolutionType,
  ComplaintResolutionStatus,
  ComplaintComponentShipment,
  Province,
  Regency,
  District,
  Village,
  SaleReturn,
  SaleReturnStatus,
  SaleReturnDecision,
  ReturnSourceType,
  ReturnInspectionResult,
  SaleReturnFinalOutcome,
  SaleReturnItem,
  ReturnTicket,
  ReturnTicketStatus,
  ReturnFinalDecision,
  ReturnTicketParticipant,
  ReturnTicketMessage,
  ReturnTicketMessageType,
  ReturnExecution,
  ReturnExecutionStatus,
  DisplayCategory,
  DisplaySupplier,
  DisplayProduct,
  DisplayProductCondition,
  DisplayProductStatus,
  DisplayStockMovement,
  DisplayMovementType,
  DisplayStockRequest,
  DisplayRequestType,
  DisplayRequestStatus,
  DisplayReturn,
  DisplayReturnStatus,
  DisplayReturnItem,
  FeatureFlag,
};
