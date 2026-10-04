# Premium LMS

A full-stack learning platform with a React/Vite client and an Express/MongoDB API. It includes course discovery and lessons, role-based administration, learner progress and reviews, coupons, invoices, notifications, and mock, PayPal, and Stripe checkout flows.

## Requirements

- Node.js 20 or later
- MongoDB running locally or a reachable MongoDB connection string

## Local Setup (Windows)

From the repository root:

```powershell
npm run install:all
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Edit `server/.env`. Set `MONGO_URI`, replace `JWT_SECRET` with a unique random secret of at least 32 characters, and set `CLIENT_URL=http://localhost:5173`. Keep `PAYMENT_MODE=mock` for a no-charge local demo. To have the seed script create a demo admin, set a unique `ADMIN_EMAIL` and an `ADMIN_PASSWORD` of at least 12 characters; without these, it seeds courses and the welcome coupon only.

Start the API and client in separate terminals from the repository root:

```powershell
npm run dev:server
npm run dev:client
```

Open the Vite URL, normally `http://localhost:5173`. Run `npm run seed` to add the sample courses and welcome coupon, and optionally the demo admin. The seed script has no default admin password.

## Payment Modes

The server's `PAYMENT_MODE` is authoritative. Keep the client `VITE_PAYMENT_MODE` in `client/.env` aligned with it:

- `mock`: no real charge; use this for local demos and tests.
- `paypal`: requires server `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and the matching PayPal environment. Configure `PAYPAL_WEBHOOK_ID` to verify webhooks and `VITE_PAYPAL_CLIENT_ID` in the client.
- `stripe`: requires server `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; set `VITE_STRIPE_ENABLED=true` to show card checkout.

Provider routes that do not match the server's configured mode are rejected. Never use mock mode in a public or production deployment.

## Useful Commands

```powershell
npm test
npm run build
npm run seed
```

`npm test` runs the offline Node.js unit tests. `npm run build` creates the client production bundle. The GitHub Actions workflow runs server tests, syntax checks, a Docker build, and the client build.

## Included Features

- Course catalog with search, categories, filters, ratings, and pagination
- Student, instructor, and admin roles; course and lesson access checks
- Course progress, reviews, coupons, purchase history, and PDF invoices
- Mock, PayPal, and Stripe payment integrations with order state transitions, webhook verification, idempotency, and full/partial refunds
- In-app notifications, optional SMTP email, and short-lived signed lesson-media URLs
- Admin transaction filters and revenue reporting; instructors can manage courses without access to payment administration

## Production Readiness

The client build and offline unit tests pass, but they do not prove end-to-end behavior against MongoDB or payment-provider sandboxes. Before launch, configure production secrets and HTTPS, use private durable media storage, set the live payment-provider webhook URLs, and test successful, failed, duplicate, and refunded payments in each enabled provider's test environment. Review backup/restore, monitoring, email delivery, and database index rollout for your deployment.

Media signing links expire after five minutes, but they are not DRM and can be used to download media while valid. Use a managed media delivery service and its signed URLs for large-scale or high-value content.