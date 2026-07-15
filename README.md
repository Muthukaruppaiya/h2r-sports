# H2R Sports — Cricket Bat Shop

React storefront for H2R Sports (Tamil Nadu). Frontend-only — works locally and on Netlify.

## Structure

```
client/     React + Vite (the live app)
server/     Optional Express API (not needed for Netlify)
netlify.toml
```

## Develop (frontend only)

```bash
npm install
npm install --prefix client
npm run dev
```

Open `http://localhost:5173`. Products, collections, and reviews load from `client/src/data/catalogue.js`. Orders save in the browser (`localStorage`).

Optional Express API (local only, not required):

```bash
npm run dev:server
```

## Build / Netlify

Root `netlify.toml` builds the client and publishes `client/dist`. SPA routes redirect to `index.html`.

```bash
npm run build
```

Redeploy on Netlify after pushing these changes.

## Pages

| Path | Description |
|------|-------------|
| `/` | Home — collections, top selling, reviews |
| `/collections/:slug` | hard-tennis · soft-tennis · season |
| `/shop` | All products + filters |
| `/shop/:id` | Product detail |
| `/cart` | Cart |
| `/checkout` | Checkout (COD / UPI / Card demo) |
| `/order/:id` | Order confirmation |

## Product images

```
client/public/products/<product-id>/
  01-front.svg
  …
```
