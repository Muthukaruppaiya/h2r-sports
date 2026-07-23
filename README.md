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
cp .env.example .env   # defaults to http://localhost:5000/api
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
| `/admin` | Admin (inventory, orders, marketing, billing, reports) |
