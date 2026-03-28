# Parcel Payment Review Database Contract

This project already supports real API mode through `VITE_API_URL` and `VITE_DATA_MODE=database`.
The parcel payment review flow below is the backend contract expected by the current frontend.

## Goal

Support these rules:

- Seller opens the "ตรวจสอบการชำระเงิน" panel for parcel orders.
- Seller can approve payment and move the parcel order to `awaiting_parcel_pickup`.
- Seller can cancel the order from the same review modal.
- The frontend must work with a real database-backed API, not only the in-memory mock store.

## Frontend Endpoints

### `GET /api/myshop/parcel-payment-reviews`

Preferred response shape:

```json
{
  "reviews": [
    {
      "orderId": "order_01",
      "shopOrderKey": "shop_01",
      "ownerId": "user_seller_01",
      "shopId": "shop_01",
      "shopName": "Vintage Corner",
      "buyerId": "user_buyer_01",
      "buyerName": "Buyer Name",
      "status": "pending_payment_verification",
      "subtotal": 4200,
      "createdAt": "2026-03-28T08:00:00.000Z",
      "submittedAt": "2026-03-28T08:10:00.000Z",
      "receiptImageUrl": "https://cdn.example.com/receipts/order_01.jpg",
      "items": [
        {
          "itemId": "order_item_01",
          "productId": "product_01",
          "name": "กล้องฟิล์ม Canon AE-1",
          "imageUrl": "https://cdn.example.com/products/product_01/main.jpg",
          "price": 4200,
          "quantity": 1
        }
      ],
      "buyerShippingAddress": {
        "name": "Buyer Name",
        "phone": "0812345678",
        "address": "Bangkok, Thailand"
      }
    }
  ]
}
```

The frontend also tolerates:

- `items`, `results`, `data.reviews`, `data.items`, `data.results`
- order-shaped payloads such as `orders`, `data.orders`, `order`, `updatedOrder`
- shop order arrays under `shopOrders`, `sellerOrders`, `subOrders`, `orderShops`, or `shops`

For compatibility with existing implementations, the frontend also tries:

- `GET /api/myshop/orders?shippingMethod=parcel`
- `GET /api/myshop/orders`
- `GET /api/orders/my-shop?shippingMethod=parcel`
- `GET /api/orders?sellerView=1&shippingMethod=parcel`

### `POST /api/myshop/parcel-payment-reviews/:orderId/shop-orders/:shopOrderKey/decision`

Preferred frontend payload:

```json
{
  "action": "cancel",
  "note": "ยอดเงินไม่ตรง",
  "reason": "ยอดเงินไม่ตรง",
  "decisionAt": "2026-03-28T09:00:00.000Z",
  "changedBy": "user_seller_01",
  "orderStatus": "cancelled",
  "shopOrderStatus": "cancelled",
  "parcelPaymentStatus": "cancelled",
  "productIds": ["product_01"],
  "syncRequest": {
    "orderId": "order_01",
    "shopOrderKey": "shop_01",
    "productIds": ["product_01"],
    "orderStatus": "cancelled",
    "reason": "ยอดเงินไม่ตรง",
    "changedBy": "user_seller_01",
    "eventAt": "2026-03-28T09:00:00.000Z"
  }
}
```

Supported actions used by the frontend:

- `approve`
- `cancel`

For compatibility with different backend route designs, the frontend also tries:

- `POST /api/myshop/orders/:orderId/shop-orders/:shopOrderKey/decision`
- `POST /api/orders/:orderId/shop-orders/:shopOrderKey/decision?sellerView=1`

Accepted response shapes:

```json
{
  "review": {
    "orderId": "order_01",
    "shopOrderKey": "shop_01",
    "status": "cancelled"
  },
  "message": "optional"
}
```

or:

```json
{
  "order": {
    "id": "order_01",
    "shopOrders": [
      {
        "shopId": "shop_01",
        "status": "cancelled",
        "parcelPayment": {
          "status": "cancelled"
        }
      }
    ]
  },
  "message": "optional"
}
```

The frontend also tolerates `updatedOrder`, `data.review`, `data.order`, and `data.updatedOrder`.

## Expected Backend Behavior

- `action=approve`
  - Persist the shop order status as `awaiting_parcel_pickup`
  - Persist parcel payment status as `approved`
  - Save review metadata such as `verifiedAt` and `verifiedBy`
- `action=cancel`
  - Persist the shop order status as `cancelled`
  - Persist parcel payment status as `cancelled`
  - Store the cancellation reason from `note` or `reason` when available
  - Release reserved inventory in the same transaction if your system reserves stock on checkout

## Suggested Database Structure

### `orders`

```json
{
  "id": "order_01",
  "userId": "user_buyer_01",
  "status": "pending_payment_verification",
  "createdAt": "2026-03-28T08:00:00.000Z"
}
```

### `order_shop_orders`

```json
{
  "id": "shop_order_01",
  "orderId": "order_01",
  "shopId": "shop_01",
  "ownerId": "user_seller_01",
  "shippingMethod": "parcel",
  "status": "pending_payment_verification",
  "subtotal": 4200
}
```

### `parcel_payment_reviews`

```json
{
  "id": "parcel_review_01",
  "orderId": "order_01",
  "shopOrderKey": "shop_01",
  "receiptImageUrl": "https://cdn.example.com/receipts/order_01.jpg",
  "status": "pending_payment_verification",
  "submittedAt": "2026-03-28T08:10:00.000Z",
  "verifiedAt": "",
  "verifiedBy": "",
  "decisionReason": ""
}
```

## Transaction Notes

- Approval and cancellation should update order state and parcel payment state in one DB transaction.
- If cancelling should free product stock or reservation, do it in the same transaction.
- Returning the updated order or updated review is enough for the frontend, as long as the final persisted status is included.
