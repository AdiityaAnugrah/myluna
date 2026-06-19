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
import Complaint, { ComplaintStatus } from './Complaint';
import Province from './Province';
import Regency from './Regency';
import District from './District';
import Village from './Village';

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
  Province,
  Regency,
  District,
  Village,
};
