# Content Report Database Contract

This project already supports real API mode through `VITE_API_URL` and `VITE_DATA_MODE=database`.
The content report flow below is the backend contract expected by the current frontend.

## Goal

Support these rules:

- Users can report a product from `ProductDetailPage`
- Users can report a shop from `SellerStorefrontPage`
- Admin reviews both product and shop reports from the same "จัดการเนื้อหา" section
- If Admin removes a product, the backend must persist the moderation result and create a seller notification with the removal reason

## Frontend Endpoints

### `POST /api/reports/products/:productId`

Example frontend payload:

```json
{
  "reason": "ภาพสินค้าไม่ตรงกับรายละเอียด",
  "submittedAt": "2026-03-28T10:00:00.000Z",
  "reportType": "product",
  "source": "product_detail_page"
}
```

Expected response:

```json
{
  "report": {
    "id": "product_report_01",
    "reportType": "product",
    "productId": "product_01",
    "productOwnerId": "user_seller_01",
    "productName": "กล้องฟิล์ม Canon AE-1",
    "productCategory": "electronics",
    "productImageUrl": "https://cdn.example.com/products/product_01/main.jpg",
    "shopId": "shop_01",
    "shopOwnerId": "user_seller_01",
    "shopName": "Vintage Corner",
    "shopAvatarUrl": "https://cdn.example.com/shop_01/avatar.jpg",
    "reporterId": "user_buyer_01",
    "reason": "ภาพสินค้าไม่ตรงกับรายละเอียด",
    "status": "open",
    "createdAt": "2026-03-28T10:00:00.000Z"
  },
  "message": "optional"
}
```

### `POST /api/reports/shops/owner/:ownerId`

Example frontend payload:

```json
{
  "reason": "ร้านค้าใช้ถ้อยคำไม่เหมาะสม",
  "submittedAt": "2026-03-28T10:00:00.000Z",
  "reportType": "shop",
  "source": "seller_storefront_page"
}
```

Expected response:

```json
{
  "report": {
    "id": "shop_report_01",
    "reportType": "shop",
    "shopId": "shop_01",
    "shopOwnerId": "user_seller_01",
    "shopName": "Vintage Corner",
    "shopAvatarUrl": "https://cdn.example.com/shop_01/avatar.jpg",
    "reporterId": "user_buyer_01",
    "reason": "ร้านค้าใช้ถ้อยคำไม่เหมาะสม",
    "status": "open",
    "createdAt": "2026-03-28T10:00:00.000Z"
  },
  "message": "optional"
}
```

### `GET /api/admin/reports`

Accepted response shape:

```json
{
  "reports": [
    {
      "id": "product_report_01",
      "reportType": "product",
      "productId": "product_01",
      "productOwnerId": "user_seller_01",
      "productName": "กล้องฟิล์ม Canon AE-1",
      "productCategory": "electronics",
      "productImageUrl": "https://cdn.example.com/products/product_01/main.jpg",
      "shopId": "shop_01",
      "shopOwnerId": "user_seller_01",
      "shopName": "Vintage Corner",
      "shopAvatarUrl": "https://cdn.example.com/shop_01/avatar.jpg",
      "reporterId": "user_buyer_01",
      "reporterName": "Buyer Name",
      "reason": "ภาพสินค้าไม่ตรงกับรายละเอียด",
      "status": "open",
      "createdAt": "2026-03-28T10:00:00.000Z",
      "resolvedAt": "",
      "resolutionNote": ""
    }
  ]
}
```

### `POST /api/admin/reports/:reportId/decision`

For product reports:

```json
{
  "action": "take_down",
  "note": "สินค้าผิดกฎเรื่องข้อมูลไม่ตรงกับความจริง"
}
```

Expected backend behavior:

- Mark the report as resolved
- Update the product moderation state so it no longer appears publicly
- Persist the removal reason on the product moderation record
- Create a seller notification record for the product owner with the same reason

For product rejection or shop report deletion:

```json
{
  "action": "dismiss",
  "note": ""
}
```

Expected backend behavior:

- For product reports, mark the report as resolved and keep the moderation audit trail
- For shop reports, hard-delete that report row and return `deletedReportId`
- Do not change product/shop public data when action is `dismiss`

## Suggested Database Structure

### `content_reports`

```json
{
  "id": "report_01",
  "reportType": "product",
  "targetProductId": "product_01",
  "targetShopId": "shop_01",
  "targetShopOwnerId": "user_seller_01",
  "reporterId": "user_buyer_01",
  "reason": "ภาพสินค้าไม่ตรงกับรายละเอียด",
  "status": "open",
  "createdAt": "2026-03-28T10:00:00.000Z",
  "resolvedAt": "",
  "resolvedBy": "",
  "resolutionNote": ""
}
```

### `product_moderation_events`

```json
{
  "id": "product_moderation_01",
  "productId": "product_01",
  "action": "take_down",
  "reason": "สินค้าผิดกฎเรื่องข้อมูลไม่ตรงกับความจริง",
  "actedBy": "user_admin",
  "actedAt": "2026-03-28T11:00:00.000Z"
}
```

### `seller_notifications`

```json
{
  "id": "seller_notification_01",
  "ownerId": "user_seller_01",
  "title": "สินค้าถูกลบออกจากร้านค้า",
  "message": "สินค้าชื่อ \"กล้องฟิล์ม Canon AE-1\" ถูกลบออกจากร้านค้าโดยผู้ดูแลระบบ เนื่องจาก: สินค้าผิดกฎเรื่องข้อมูลไม่ตรงกับความจริง",
  "entityType": "product",
  "entityId": "product_01",
  "createdAt": "2026-03-28T11:00:00.000Z",
  "readAt": ""
}
```

## Transaction Notes

- Admin product removal should update `content_reports`, `products`, and `seller_notifications` in one DB transaction
- Shop report deletion should hard-delete that shop report record so it disappears from the admin list immediately
- The admin list endpoint should return both product and shop reports in one unified dataset
