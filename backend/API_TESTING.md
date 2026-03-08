# WMS Backend API Testing Guide

## Authentication

### Login
```powershell
# PowerShell
$body = @{
    email = "admin@wms.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.data.accessToken
```

### Get Current User
```powershell
$headers = @{
    Authorization = "Bearer $token"
}
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/me" -Method GET -Headers $headers
```

---

## Products

### Get All Products
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/products" -Method GET
```

### Get Low Stock Products
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/products/low-stock" -Method GET -Headers $headers
```

### Create Product
```powershell
$headers = @{ Authorization = "Bearer $token" }
$body = @{
    sku = "TEST-001"
    name = "Test Product"
    categoryId = "<category-id>"
    unit = "pcs"
    purchasePrice = 10000
    sellingPrice = 15000
    minStock = 5
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/products" -Method POST -Body $body -ContentType "application/json" -Headers $headers
```

---

## Categories

### Get All Categories
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/categories" -Method GET
```

### Create Category
```powershell
$headers = @{ Authorization = "Bearer $token" }
$body = @{
    name = "New Category"
    description = "Category description"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/categories" -Method POST -Body $body -ContentType "application/json" -Headers $headers
```

---

## Suppliers

### Get All Suppliers
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/suppliers" -Method GET
```

### Create Supplier
```powershell
$headers = @{ Authorization = "Bearer $token" }
$body = @{
    name = "New Supplier"
    contact = "John Doe"
    phone = "08123456789"
    email = "supplier@example.com"
    address = "Supplier Address"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/suppliers" -Method POST -Body $body -ContentType "application/json" -Headers $headers
```

---

## Purchases

### Create Purchase
```powershell
$headers = @{ Authorization = "Bearer $token" }
$body = @{
    purchaseNumber = "PO-001"
    supplierId = "<supplier-id>"
    purchaseDate = "2026-02-05"
    items = @(
        @{
            productId = "<product-id>"
            quantity = 10
            price = 10000
        }
    )
    notes = "Purchase notes"
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/purchases" -Method POST -Body $body -ContentType "application/json" -Headers $headers
```

### Get All Purchases
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/purchases" -Method GET -Headers $headers
```

---

## Sales

### Create Sale
```powershell
$headers = @{ Authorization = "Bearer $token" }
$body = @{
    saleNumber = "SO-001"
    saleDate = "2026-02-05"
    customerName = "Customer Name"
    customerPhone = "08123456789"
    paymentMethod = "CASH"
    items = @(
        @{
            productId = "<product-id>"
            quantity = 2
            price = 15000
            discount = 0
        }
    )
    notes = "Sale notes"
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/sales" -Method POST -Body $body -ContentType "application/json" -Headers $headers
```

### Get All Sales
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/sales" -Method GET -Headers $headers
```

---

## Stock

### Get Stock Movements
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/stock/movements" -Method GET -Headers $headers
```

### Create Stock Adjustment
```powershell
$headers = @{ Authorization = "Bearer $token" }
$body = @{
    productId = "<product-id>"
    quantity = 5  # positive for increase, negative for decrease
    notes = "Stock adjustment reason"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/stock/adjustment" -Method POST -Body $body -ContentType "application/json" -Headers $headers
```

### Get Stock Report
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/stock/report" -Method GET -Headers $headers
```

---

## Database Credentials

**Admin User:**
- Email: `admin@wms.com`
- Password: `admin123`
- Role: SUPER_ADMIN

**Sample Data:**
- 5 Categories (Electronics, Furniture, Stationery, Food & Beverage, Clothing)
- 4 Suppliers
- 10 Products (including some with low stock)

---

## Notes

1. Replace `<category-id>`, `<supplier-id>`, `<product-id>` with actual UUIDs from the database
2. Get IDs by calling the respective GET endpoints first
3. All authenticated endpoints require the `Authorization: Bearer <token>` header
4. Server is running on `http://localhost:3000`
