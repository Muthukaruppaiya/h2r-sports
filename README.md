# StrikePro India — Cricket Bat Shop

Shopify-style storefront inspired by [Valley Sports Kashmir](https://valleysportskashmir.com/) — catalog home, collections, product grids, COD/UPI messaging.

## Structure

```
client/   React + Vite
server/   Express API (products, collections, reviews)
FRAMES/   (unused on storefront — kept for assets)
```

## Pages

| Path | Description |
|------|-------------|
| `/` | Shop homepage — collections, top selling, trust strip, loved bats, reviews |
| `/collections/:slug` | hard-tennis · soft-tennis · season |
| `/shop` | All products + filters |
| `/shop/:id` | Product detail + bag |

## Product images

Put multiple photos per bat in:

```
client/public/products/<product-id>/
  01-front.jpg
  02-side.jpg
  03-scoop.jpg
  ...
```

The API auto-loads every `.jpg/.png/.webp/.svg` in that folder (sorted). Product detail shows a gallery with thumbnails + next/prev. Cards show the first image and a “N photos” badge.# h2r-sports
