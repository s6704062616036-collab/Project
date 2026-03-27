import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  jsx: true,
  extensions: [".js", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts", ".mtsx", ".ctsx", ".jsx"],
});

const { MyOrder } = jiti("../src/models/MyOrder.jsx");
const { MyShopService } = jiti("../src/services/MyShopService.jsx");
const { OrderService } = jiti("../src/services/OrderService.jsx");

class StubHttpClient {
  constructor({ getResponses = {} } = {}) {
    this.getResponses = new Map(Object.entries(getResponses));
    this.calls = [];
  }

  async get(path) {
    this.calls.push(path);

    if (!this.getResponses.has(path)) {
      throw new Error(`No stubbed GET response for ${path}`);
    }

    const response = this.getResponses.get(path);
    if (response instanceof Error) {
      throw response;
    }

    return typeof response === "function" ? response(path) : response;
  }
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const verifyBuyerModelParsing = () => {
  const order = MyOrder.fromJSON({
    id: "order-model-1",
    buyerId: "buyer-1",
    sellerOrders: [
      {
        ownerId: "seller-1",
        shopId: "shop-1",
        shopName: "Parcel Shop",
        shippingMethod: "parcel",
        status: "awaiting_parcel_pickup",
        orderItems: [
          {
            id: "item-1",
            productId: "product-1",
            productName: "Box",
            image: "/box.png",
            price: 120,
            qty: 1,
          },
        ],
        payment: {
          status: "pending_seller_confirmation",
          receiptUrl: "https://cdn.example.com/slip-model.jpg",
          submittedAt: "2026-03-28T10:00:00.000Z",
        },
        shippingAddress: {
          name: "Buyer One",
          phone: "0812345678",
          address: "Bangkok",
        },
      },
    ],
  });

  const shopOrder = order.shopOrders[0];
  assert(order.shopOrders.length === 1, "MyOrder should parse sellerOrders as shopOrders");
  assert(
    shopOrder?.parcelPayment?.receiptImageUrl === "https://cdn.example.com/slip-model.jpg",
    "MyOrder should map receipt alias into parcelPayment.receiptImageUrl",
  );
  assert(
    shopOrder?.getEffectiveStatus?.() === "awaiting_parcel_pickup",
    "MyOrder should prefer approved shop status over stale nested payment status",
  );
};

const verifyOrderServiceParsing = async () => {
  const service = new OrderService();
  service.http = new StubHttpClient({
    getResponses: {
      "/api/orders/me": {
        data: {
          orders: [
            {
              id: "order-service-1",
              buyerId: "buyer-1",
              orderDate: "2026-03-28T11:00:00.000Z",
              sellerOrders: [
                {
                  ownerId: "seller-1",
                  shopId: "shop-1",
                  shippingMethod: "parcel",
                  paymentVerification: {
                    slipUrl: "https://cdn.example.com/slip-service.jpg",
                    status: "uploaded",
                    submittedAt: "2026-03-28T11:05:00.000Z",
                  },
                  status: "pending_payment_verification",
                  products: [
                    {
                      id: "item-1",
                      productId: "product-1",
                      name: "Tape",
                      imageUrl: "/tape.png",
                      price: 50,
                      quantity: 2,
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  });

  const { orders } = await service.listMyOrders();
  const shopOrder = orders[0]?.shopOrders?.[0];

  assert(orders.length === 1, "OrderService should parse data.orders response shape");
  assert(
    shopOrder?.parcelPayment?.receiptImageUrl === "https://cdn.example.com/slip-service.jpg",
    "OrderService + MyOrder should parse paymentVerification slip alias",
  );
  assert(
    shopOrder?.getEffectiveStatus?.() === "pending_payment_verification",
    "OrderService + MyOrder should keep pending verification status",
  );
};

const verifySellerReviewFallback = async () => {
  const service = new MyShopService();
  service.http = new StubHttpClient({
    getResponses: {
      "/api/myshop/parcel-payment-reviews": new Error("404 Not Found"),
      "/api/myshop/orders?shippingMethod=parcel": {
        orders: [
          {
            id: "order-review-1",
            buyer: {
              id: "buyer-1",
              name: "Buyer One",
            },
            shopOrders: [
              {
                ownerId: "seller-1",
                shopId: "shop-1",
                shopName: "Parcel Shop",
                shippingMethod: "parcel",
                status: "pending_payment_verification",
                items: [
                  {
                    id: "item-1",
                    productId: "product-1",
                    name: "Parcel Box",
                    imageUrl: "/parcel-box.png",
                    price: 120,
                    quantity: 1,
                  },
                ],
                paymentVerification: {
                  slipUrl: "https://cdn.example.com/slip-review.jpg",
                  status: "uploaded",
                  submittedAt: "2026-03-28T12:00:00.000Z",
                },
                shippingAddress: {
                  name: "Buyer One",
                  phone: "0812345678",
                  address: "Bangkok",
                },
              },
            ],
          },
        ],
      },
    },
  });

  const { reviews } = await service.listParcelPaymentReviews();
  const review = reviews[0];

  assert(reviews.length === 1, "MyShopService should fall back to generic myshop orders endpoint");
  assert(review?.hasReceipt?.(), "Seller review should contain receipt image from fallback payload");
  assert(
    review?.receiptImageUrl === "https://cdn.example.com/slip-review.jpg",
    "Seller review should map paymentVerification slip alias",
  );
  assert(
    review?.getEffectiveStatus?.() === "pending_payment_verification",
    "Seller review should normalize pending verification status from fallback payload",
  );
};

const main = async () => {
  verifyBuyerModelParsing();
  await verifyOrderServiceParsing();
  await verifySellerReviewFallback();
  console.log("verify-parcel-payment-contracts: PASS");
};

main().catch((error) => {
  console.error("verify-parcel-payment-contracts: FAIL");
  console.error(error);
  globalThis.process.exit(1);
});
