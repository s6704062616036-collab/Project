# Seller Storefront Database Contract

This project already supports real API mode through `VITE_API_URL` and `VITE_DATA_MODE=database`.
The seller storefront flow below is the backend contract expected by the current frontend.

## Goal

Support these rules:

- `ProductDetailPage` must show a seller profile card under the product price.
- Clicking the seller profile card must open a public seller storefront page.
- The storefront page must show only public shop data and the seller's active products.
- The frontend must work with a real database-backed API, not only a mock response.

## Frontend Endpoints

### `GET /api/products/:productId`

Accepted response shape:

```json
{
  "product": {
    "id": "product_01",
    "ownerId": "user_seller_01",
    "shopId": "shop_01",
    "shopName": "Vintage Corner",
    "shopAvatarUrl": "https://cdn.example.com/shop_01/avatar.jpg",
    "name": "กล้องฟิล์ม Canon AE-1",
    "category": "electronics",
    "imageUrl": "https://cdn.example.com/products/product_01/main.jpg",
    "imageUrls": [
      "https://cdn.example.com/products/product_01/main.jpg"
    ],
    "price": 4200,
    "exchangeItem": "",
    "description": "ใช้งานได้ปกติ",
    "saleStatus": "available",
    "createdAt": "2026-03-28T08:00:00.000Z"
  }
}
```

The extra fields used by the seller button are:

- `ownerId`
- `shopId`
- `shopName`
- `shopAvatarUrl`

### `GET /api/shops/owner/:ownerId/storefront`

Accepted response shape:

```json
{
  "storefront": {
    "shop": {
      "id": "shop_01",
      "ownerId": "user_seller_01",
      "shopName": "Vintage Corner",
      "description": "ขายของสะสมและอุปกรณ์กล้องมือสอง",
      "avatarUrl": "https://cdn.example.com/shop_01/avatar.jpg"
    },
    "products": [
      {
        "id": "product_01",
        "ownerId": "user_seller_01",
        "shopId": "shop_01",
        "shopName": "Vintage Corner",
        "shopAvatarUrl": "https://cdn.example.com/shop_01/avatar.jpg",
        "name": "กล้องฟิล์ม Canon AE-1",
        "category": "electronics",
        "imageUrl": "https://cdn.example.com/products/product_01/main.jpg",
        "imageUrls": [
          "https://cdn.example.com/products/product_01/main.jpg"
        ],
        "price": 4200,
        "description": "ใช้งานได้ปกติ",
        "saleStatus": "available",
        "createdAt": "2026-03-28T08:00:00.000Z"
      }
    ]
  },
  "message": "optional"
}
```

The frontend also tolerates:

- `shop` and `products` at the root
- `data.storefront`
- `result.storefront`

Backend behavior expected by the frontend:

- Return only public shop fields in `storefront.shop`
- Exclude sensitive seller fields such as `citizenId` and `parcelQrCodeUrl`
- Return only products that are visible to the marketplace
- Sort products by `createdAt` descending

## Suggested Database Structure

### `shop_profiles`

```json
{
  "id": "shop_01",
  "ownerId": "user_seller_01",
  "shopName": "Vintage Corner",
  "description": "ขายของสะสมและอุปกรณ์กล้องมือสอง",
  "avatarUrl": "https://cdn.example.com/shop_01/avatar.jpg",
  "updatedAt": "2026-03-28T08:00:00.000Z"
}
```

### `products`

```json
{
  "id": "product_01",
  "ownerId": "user_seller_01",
  "name": "กล้องฟิล์ม Canon AE-1",
  "category": "electronics",
  "price": 4200,
  "imageUrl": "https://cdn.example.com/products/product_01/main.jpg",
  "imageUrls": [
    "https://cdn.example.com/products/product_01/main.jpg"
  ],
  "description": "ใช้งานได้ปกติ",
  "saleStatus": "available",
  "moderationStatus": "active",
  "createdAt": "2026-03-28T08:00:00.000Z"
}
```

## Query Notes

- `GET /api/products/:productId` should join `products.ownerId -> shop_profiles.ownerId`
- `GET /api/shops/owner/:ownerId/storefront` can be built from one shop query plus one product query
- Both queries should filter out taken-down products
- The storefront page should not require a logged-in seller session for read access
