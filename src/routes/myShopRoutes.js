const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const {
  getMyShop,
  upsertMyShop,
  getMyProducts,
  createMyProduct,
  updateMyProduct,
  deleteMyProduct,
} = require("../controllers/myShopController");
const {
  getSellerParcelPaymentReviews,
  decideSellerParcelPaymentReview,
  updateSellerParcelShipmentStatus,
} = require("../controllers/orderController");

router.get("/me", protect, getMyShop);
router.put("/me", protect, upload.single("parcelQrCode"), upsertMyShop);

router.get("/products", protect, getMyProducts);
router.get("/parcel-payment-reviews", protect, getSellerParcelPaymentReviews);
router.post("/parcel-payment-reviews/:orderId/shop-orders/:shopOrderKey/decision", protect, decideSellerParcelPaymentReview);
router.post("/parcel-payment-reviews/:orderId/shop-orders/:shopOrderKey/shipment", protect, updateSellerParcelShipmentStatus);
router.post("/products", protect, upload.array("images", 4), createMyProduct);
router.patch("/products/:id", protect, upload.array("images", 4), updateMyProduct);
router.put("/products/:id", protect, upload.array("images", 4), updateMyProduct);
router.delete("/products/:id", protect, deleteMyProduct);

module.exports = router;
