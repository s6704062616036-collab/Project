# Shop KYC Database Contract

This project already supports real API mode through `VITE_API_URL` and `VITE_DATA_MODE=database`.
The shop KYC flow below is the backend contract expected by the current frontend.

## Goal

Support these rules:

- Seller enters `shopName`, `description`, `citizenId` and shop QR code.
- `citizenId` must be exactly 13 digits.
- First submission does not write approved shop data immediately.
- Admin approves or rejects the KYC submission.
- On approval, approved shop data is persisted and `citizenId` becomes immutable.
- On rejection, pending submission is rejected and approved shop data is left unchanged.
- If an already-approved shop changes QR code, backend should create a new pending KYC submission while keeping the old approved QR code active until approval.

## Frontend Endpoints

### `GET /api/myshop/me`

Accepted response shapes:

```json
{
  "shop": {
    "id": "shop_01",
    "ownerId": "user_01",
    "shopName": "My Shop",
    "description": "Shop description",
    "citizenId": "1101700203451",
    "parcelQrCodeUrl": "https://...",
    "kycStatus": "approved",
    "kycSubmittedAt": "2026-03-28T08:00:00.000Z",
    "kycReviewedAt": "2026-03-28T09:00:00.000Z",
    "kycApprovedAt": "2026-03-28T09:00:00.000Z",
    "moderationNote": "",
    "pendingSubmission": {
      "shopName": "My Shop",
      "description": "Waiting for review",
      "citizenId": "1101700203451",
      "parcelQrCodeUrl": "https://...",
      "submittedAt": "2026-03-28T08:00:00.000Z"
    }
  },
  "message": "optional"
}
```

The frontend also tolerates `shopProfile`, `merchant`, `data.shop`, `data.shopProfile`, and `data.merchant`.

### `PUT /api/myshop/me`

The frontend sends the normal shop fields plus KYC metadata:

```json
{
  "shopName": "My Shop",
  "description": "Shop description",
  "citizenId": "1101700203451",
  "parcelQrCodeUrl": "https://...",
  "submissionAction": "submit_kyc_review",
  "requiresKycReview": true,
  "kycSubmissionType": "initial_kyc",
  "hasApprovedKycHistory": false,
  "hasPendingSubmission": false,
  "citizenIdLocked": false,
  "qrCodeChanged": false,
  "submissionChannel": "my_shop_page",
  "kycFlowVersion": "shop-kyc-v1"
}
```

When QR code is uploaded, the same keys are sent as `multipart/form-data` together with:

- `parcelQrCode`
- `paymentQrCode`

Backend behavior expected by the frontend:

- `submissionAction=save_shop_profile`
  - Persist `shopName` and `description` directly.
  - Do not allow `citizenId` to change if KYC is already approved.
- `submissionAction=submit_kyc_review`
  - Create or replace a pending KYC submission.
  - Do not overwrite approved shop data yet.
  - Return the latest shop profile including `pendingSubmission`.

### `GET /api/admin/members`

Accepted member fields used by the KYC admin screen:

```json
{
  "id": "user_01",
  "name": "Seller",
  "email": "seller@example.com",
  "phone": "0812345678",
  "avatarUrl": "https://...",
  "username": "seller",
  "role": "user",
  "kycStatus": "pending",
  "banStatus": "active",
  "shopId": "shop_01",
  "shopName": "My Shop",
  "shopDescription": "Waiting for review",
  "citizenId": "1101700203451",
  "kycCitizenId": "1101700203451",
  "kycQrCodeUrl": "https://...",
  "hasPendingKycSubmission": true,
  "kycSubmittedAt": "2026-03-28T08:00:00.000Z",
  "kycReviewedAt": "",
  "kycApprovedAt": "",
  "moderationNote": ""
}
```

The frontend also tolerates nested `data.members`, `data.items`, and `data.results`.

### `POST /api/admin/members/:memberId/decision`

Frontend payload example:

```json
{
  "action": "approve_kyc",
  "decisionAt": "2026-03-28T09:00:00.000Z",
  "reviewScope": "shop_kyc",
  "decisionSource": "admin_console",
  "shopId": "shop_01"
}
```

Expected backend behavior:

- `approve_kyc`
  - Wrap in a transaction.
  - Copy pending submission into approved shop profile.
  - Mark submission as approved.
  - Set shop `kycStatus=approved`.
  - Keep `citizenId` immutable for future updates.
- `reject_kyc`
  - Wrap in a transaction.
  - Mark submission as rejected.
  - Keep approved shop profile unchanged.
  - If there was no approved shop profile yet, keep shop data empty/unapproved.

## Suggested Database Structure

### `shop_profiles`

```json
{
  "id": "shop_01",
  "ownerId": "user_01",
  "shopName": "My Shop",
  "description": "Approved shop profile",
  "citizenId": "1101700203451",
  "parcelQrCodeUrl": "https://...",
  "kycStatus": "approved",
  "kycSubmittedAt": "2026-03-28T08:00:00.000Z",
  "kycReviewedAt": "2026-03-28T09:00:00.000Z",
  "kycApprovedAt": "2026-03-28T09:00:00.000Z",
  "moderationNote": ""
}
```

### `shop_kyc_submissions`

```json
{
  "id": "kyc_01",
  "shopId": "shop_01",
  "ownerId": "user_01",
  "shopName": "My Shop",
  "description": "Pending profile update",
  "citizenId": "1101700203451",
  "parcelQrCodeUrl": "https://...",
  "status": "pending",
  "submittedAt": "2026-03-28T08:00:00.000Z",
  "reviewedAt": "",
  "reviewedBy": "",
  "moderationNote": ""
}
```

## Transaction Notes

- Approval and rejection should use DB transactions.
- Approval should update both `shop_profiles` and `shop_kyc_submissions` in the same transaction.
- Rejection should update only the submission status and review metadata.
- If QR code changes after approval, keep the old approved QR code usable until the new submission is approved.
