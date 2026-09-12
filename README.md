# H2R Sports — Cricket Bat Shop

Full-stack store: React (Netlify) + Express/Mongo API (Render) + Razorpay checkout.

## Structure

```
client/        React + Vite storefront & admin
server/        Express API (orders, products, Razorpay, marketing)
netlify.toml   Netlify build → client/dist, API → Render
```

## Production URLs

| Layer | URL |
|-------|-----|
| API (Render) | `https://h2r-sports.onrender.com` |
| API base | `https://h2r-sports.onrender.com/api` |
| Client (Netlify) | your Netlify site URL |

Client production builds use `VITE_API_URL=https://h2r-sports.onrender.com/api`  
(from `netlify.toml` + `client/.env.production`).

## Local development

```bash
# API
cd server
cp .env.example .env   # set MONGO_URI, JWT_SECRET, Razorpay test keys
npm install
npm run dev

# Client (separate terminal)
cd client
cp .env.example .env
# For local API: set VITE_API_URL=http://localhost:5000/api in client/.env
# Default example points at Render for production-parity testing
npm install
npm run dev
```

Open `http://localhost:5173`.

## Deploy checklist

### Render (server)
Set environment variables:
- `MONGO_URI`
- `JWT_SECRET`
- `PUBLIC_API_URL=https://h2r-sports.onrender.com`
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (live keys when ready)
- `RAZORPAY_WEBHOOK_SECRET` — Razorpay Dashboard → Webhooks → `payment.captured`  
  URL: `https://h2r-sports.onrender.com/api/payments/razorpay/webhook`
- `SMTP_USER` / `SMTP_PASS` — **your** sending mailbox (your Gmail App Password, Hostinger email, or Brevo). Not the client Gmail. Required for order emails **and** the password-reset / verify-email links below to actually deliver — without it, links are only logged to the server console.
- `STORE_EMAIL=h2rsports7@gmail.com` — client inbox (BCC + Reply-To only)
- `CLIENT_URL=https://<your-netlify-domain>` — used to build password-reset / verify-email links. Falls back to the request's Origin header if unset, but set it explicitly on Render so emails always link to the live site.
- Do **not** set `SEED_DEFAULT_ADMIN` on Render. Change the admin password if it is still the old default.

Start command: `npm start` (from `server/`)

### Netlify (client)
`netlify.toml` already sets:

```toml
VITE_API_URL = "https://h2r-sports.onrender.com/api"
```

Redeploy after push. Confirm Site settings → Environment has the same `VITE_API_URL` if overridden.

### Razorpay Dashboard
Add your **Netlify domain** under Website / Checkout allowed domains, and enable **UPI** for live payments.

## Pages

| Path | Description |
|------|-------------|
| `/` | Home |
| `/shop` | Catalogue |
| `/shop/:id` | Product detail |
| `/checkout` | Razorpay prepaid checkout |
| `/order/:id` | Order success |
| `/payment-failed` | Payment failed / not-confirmed recovery page |
| `/login` / `/register` | Auth |
| `/forgot-password` | Request a password reset email |
| `/reset-password/:token` | Set a new password (from email link) |
| `/verify-email/:token` | Confirm an email address (from email link) |
| `/my-orders` | Customer account — orders, buy again, profile (resend verification here) |
| `/policies/terms` \| `/returns` \| `/refund-cancellation` \| `/shipping` \| `/privacy` | Policy pages |
| `/cookie-preferences` | Cookie consent preferences |
| `/admin` | Admin (inventory, orders, marketing, billing, reports) |
