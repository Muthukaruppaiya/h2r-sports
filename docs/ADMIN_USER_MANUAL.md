# H2R Sports — Admin Panel User Manual

This manual walks through the Admin panel from top to bottom, in the same order as the left-hand sidebar: **Home → Items → Sales → Online Store → Marketing → Reports → Integrations**. Screenshots aren't included, but every field, button, and behaviour below matches what's actually in the code, so you can follow along on your screen.

---

## 1. Accessing the Admin Panel

**URL:** `https://your-domain.com/admin` (or `http://localhost:5173/admin` while developing)

1. Go to `/login?redirect=admin` (or just visit `/admin` — you'll be redirected to log in if you're not signed in as an admin).
2. Sign in with an **admin account email + password**. Admin accounts sign in with email/password only — the phone-OTP checkout login is for customers and is blocked for admin accounts.
3. Default seeded admin (change this before going live!): `admin@h2rsports.in` / `admin123`.

**Access control:** If you're logged in but your account isn't an admin, you'll see an "Access denied" screen with a link back to the login page. Every single admin page and API route requires a valid admin session — there's no partial/guest access to any admin screen.

**Logging out:** Click **Log out** in the top-right of any admin page. This clears your session token and sends you back to the admin login screen.

---

## 2. The Admin Layout (applies to every page)

Every admin screen shares the same shell:

- **Left sidebar** — navigation, grouped into: Home, Items, Sales, Online Store, Marketing, Reports, Integrations, plus two "Quick apps" shortcuts (Store Billing, Online Billing) pinned at the bottom.
- **Top bar** — page title + subtitle, the 🔔 **notification bell**, your name/email chip, a **Store** button (opens the public storefront in the same tab), and **Log out**.
- **Mobile:** the sidebar collapses behind a hamburger menu (☰) at the top; tap it to open/close. Menu closes automatically after you navigate.

### The notification bell 🔔

- Polls for new notifications every 30 seconds.
- Shows an unread-count badge (caps display at "9+").
- Click it to open a dropdown of recent notifications (currently used for **new order placed** alerts).
- Clicking a notification marks it read and jumps you straight to that order in **Online Orders** (highlighting it and opening its detail drawer).
- **Mark all read** clears the unread badge.

---

## 3. Home — Dashboard

**Path:** `/admin` (sidebar: **Home**)

The landing page after login. Shows, at a glance:

| KPI card | What it means |
|---|---|
| **Total revenue** | Sum of `total` across every paid online order |
| **Total orders** | Lifetime count of paid online orders |
| **Avg. order value** | Revenue ÷ orders |
| **Shop sales (physical)** | Total from the Store Billing (walk-in) ledger, with a link to jump straight to **Store Billing** |

Below the KPIs: a **Recent orders** table (the 6 most recent orders — ID, customer, amount, status pill) with a **View all** link to the full **Online Orders** page. Quick-action buttons at the top: **Inventory** and **View orders**.

---

## 4. Items (Inventory / Categories / Collections)

**Path:** `/admin/inventory` — sidebar group **Items**, with 3 tabs: **Inventory**, **Categories**, **Collections**.

### 4.1 Inventory tab (products)

The main product catalogue table: thumbnail, name + ID, category, price, in-stock/out-of-stock pill, and row actions.

**Row actions:**
- **Stock** — one click toggles In stock ⇄ Out of stock (this is what customers see storefront-wide; there's no numeric quantity tracking, just this on/off flag).
- **Edit** — opens the product drawer pre-filled.
- **Delete** — asks for confirmation, then permanently removes the product.

**+ Add Product** opens the same drawer, empty. The product form has 5 sections:

1. **Basics** — Product ID (URL-safe, e.g. `karrupu-edition`; locked once created), Name, Sale price, Compare/MRP price, Collection (dropdown, auto-fills Category), Category, Tagline, Badge (e.g. "Sale").
2. **Specs** — Willow type, Weight note (free text shown on the product card), Made in (defaults to "Tamil Nadu, India"), Description, Features (one bullet per line).
3. **Sizes** — a repeatable row editor (ID / Label / Price). Customers pick one of these at checkout. Leave ID blank and it auto-generates from the Label. At least one size row is required — if you leave this empty, a single "Standard" size is created automatically from the Sale price.
4. **Weight ranges** — repeatable From (g) → To (g) rows (e.g. `850` to `950` becomes "850g – 950g"). Both fields are required per row if you fill either one.
5. **Images** — drag/choose files to upload (stored in MongoDB, not local disk, so they survive server redeploys) **or** paste a URL/path and press Enter/"Add URL". The **first image is the catalogue thumbnail**. Each image has its own Remove button.
6. **Visibility** — three checkboxes: **In stock**, **Top selling**, **Most loved** (the last two control homepage highlight sections).

Click **Save product**. If weight ranges don't come back matching what you entered, you'll get an explicit error telling you to restart/redeploy the API — this is a safety check, not a normal occurrence.

### 4.2 Categories tab

Read-only table, auto-computed from your products: Category name, product count, in-stock count. There's no separate "create category" step — categories come from whatever you type into a product's Category field.

### 4.3 Collections tab

Read-only table of collections (ID, display name, product count). Collections themselves are managed in the database/seed data, not from this screen — this tab is just a reporting view.

---

## 5. Sales

Sidebar group **Sales** contains four screens: **Online Orders**, **Store Billing**, **Online Billing**, **Customers**.

### 5.1 Online Orders

**Path:** `/admin/orders` — this is the fulfillment control centre for every website order.

**Order pipeline:** `Ordered → Accepted → Packed → Shipped (courier) → Delivered`, with **Cancelled** available as a side-branch from any state except Delivered/Cancelled. Each order can only move forward one step at a time (or be cancelled) — you can't skip stages.

**KPI cards:** Total orders, Needs action (Ordered + Accepted), Awaiting courier (Packed), Revenue collected (paid orders only).

**Alert banner:** if there are Packed orders waiting for courier pickup and you're not already viewing that filter, a banner appears: *"📦 N orders packed and waiting for courier pickup — Review & ship →"*.

**Filter tabs:** All, Pending courier (= Packed), then one tab per status (Ordered, Accepted, Packed, Shipped, Delivered, Cancelled), each with a live count.

**Search box:** matches order ID, customer name/email/phone, or courier tracking ID.

**The orders table** — one row per order:
- Checkbox (only selectable when status = **Packed** — used for bulk address-label printing)
- Order ID + placed date
- Customer (avatar initials, name, email, phone)
- Items (first item shown, "+N more items" tooltip lists the rest)
- Payment method + payment status pill (Paid / COD Pending / Refunded)
- Total
- **Status cell**: current status pill, a one-click **advance button** (e.g. "Accept order", "Mark packed", "Ship order", "Mark delivered" — label changes based on what's next), a **Cancel order** link (hidden once Delivered/Cancelled), and courier tracking info if shipped.
- **Actions**: **View** (opens the full detail drawer) and **🧾 Invoice** (opens a printable invoice for that order).

**Advancing status — what happens at each step:**
- **Accept order**: no side effects beyond the status change + a confirmation email is queued (best-effort — never blocks the update if email isn't configured).
- **Mark packed**: same, **and it automatically opens a print dialog with that order's shipping address label** — no need to separately select the checkbox and click "Print addresses" for a single order.
- **Ship order**: opens a **Courier details** popup first — you must fill in Courier name and Tracking ID (Tracking URL and Notes are optional) before it will mark the order Shipped. This info is what customers see for their own tracking.
- **Mark delivered**: final step, no further actions available on that order afterwards.
- **Cancel order**: asks for confirmation first ("This cannot be undone"), then cancels.

**Bulk address-label printing:** tick the checkbox on one or more **Packed** orders (or use "Select all pending courier" in the panel header), then click **🖨️ Print addresses (N)** at the top of the page. This opens a new browser tab with one A4-sized shipping label per order (brand header, order ID, Ship To name/address/phone, item list) and triggers the print dialog automatically after a short delay. If your browser blocks the pop-up, you'll see an alert asking you to allow pop-ups for the site.

**Order detail drawer** (click **View**): shows a full status dropdown (only lets you pick statuses that are actually reachable from the current one), a visual timeline (Ordered → Accepted → Packed → Shipped → Delivered, each stage timestamped once reached), courier tracking box (if shipped), full customer info, full shipping address, and a full itemised list with line totals. Also has its own **🧾 Print invoice** button.

**Printable invoice** (🧾 Invoice / Print invoice): a formatted tax invoice / payment receipt — brand header, invoice ID + date, Billed To / Ship To, payment method + status, itemised table, subtotal/shipping/total, and a GST/no-refund footnote. Click **Print / PDF** inside it to print or save as PDF; it's formatted to fit one A4 page.

### 5.2 Store Billing

**Path:** `/admin/store-billing` — for **physical, walk-in counter sales** (not website orders).

**KPI cards:** Shop sales (total ₹ + bill count), plus a breakdown by Cash / UPI / Card.

**Filters:** search (customer/bat/bill ID), payment method, date range (From/To).

**Table:** Bill ID, Customer (name + phone, defaults to "Walk-in" if blank), Item (name + size/weight/qty), Discount, Date, Payment method pill, Amount, and Edit/Delete actions.

**+ New shop bill** opens a form:
1. Pick a **Product** from inventory (auto-fills item name).
2. Pick a **Size** (required) and optionally a **Weight range**, which auto-fill the unit price.
3. **Qty**, **Unit price**, and **Discount** — the **Final amount** field recalculates automatically as you change any of these (it's read-only, so you can't accidentally type an inconsistent total).
4. **Payment** method (Cash / UPI / Card), **Sale date**, optional **Notes**.
5. Optional **Customer name** / **Phone** — deliberately positioned last since walk-in staff often ask for these only at checkout, if at all.

Click **Save shop bill**. Edit re-opens the same form pre-filled; Delete asks for confirmation.

### 5.3 Online Billing

**Path:** `/admin/billing` — a billing/finance view over the **same online orders** as the Orders page, focused on payment reconciliation rather than fulfillment.

**KPI cards:** Collected (₹ + paid-bill count), Refunded (₹ + count), Pending (₹ + count), and a combined UPI/Card breakdown.

**Filters:** search (order/customer/UPI ref), Payment status (Paid / Refunded / Pending), Method (UPI / Card / COD), date range.

**Table:** Invoice ID, date, customer, method + payment reference (UPI ID, or masked card + issuer), payment status pill, amount, and a **View bill** button that opens the same printable invoice used on the Orders page.

### 5.4 Customers

**Path:** `/admin/customers` — auto-generated buyer directory, built from all **paid** online orders (there's no separate "add customer" flow; customers appear here once they place a paid order).

**Table:** Name, Email, Phone, Total Orders, Total Spent (all aggregated automatically), and an **Edit** action to correct a customer's stored Name/Phone (email is the lookup key and can't be changed here). Saving updates their record and syncs the corrected name/phone onto their past orders too, so the admin view stays consistent everywhere.

---

## 6. Online Store

Sidebar group **Online Store** has one entry: **Visit Store**, which opens the public-facing website (`/`) — handy for quickly checking how a change looks live without leaving the admin session.

---

## 7. Marketing

**Path:** `/admin/marketing` — sidebar group **Marketing**, with 3 tabs (**Status rings**, **Floating video**, **Homepage showcase**) plus a separate **Reviews** screen.

**KPI cards at the top:** Live (status rings currently visible to customers), Statuses (total created), Floating videos (active count), Showcase videos (active count), Products (catalogue size, for reference).

**Important: nothing here goes live until you click Publish.** Every edit (new video, new status, toggling active, reordering, deleting) is staged locally first — you'll see a *"Saved — click Publish to go live"* toast. The **Publish live** button (top-right on desktop, in the bottom action bar on mobile) is what actually pushes your changes to the public storefront.

### 7.1 Status rings tab

These power the WhatsApp-style "status" bubbles/rings shown on the storefront.

- **Storefront preview** strip at the top shows exactly what's currently live.
- Below it, a gallery of every status you've created, each tagged **Live** / **Off** / **Expired**, and **Photo**/**Video**.
- **+ New status**: upload a photo or video (JPG/PNG/WEBP/GIF or MP4/WEBM/MOV, max 50MB), set a **Duration** (1–7 days — after which it auto-expires from the storefront), an optional **Caption**, a **WhatsApp CTA** label and pre-filled message, and a **Sort** order.
- Each tile has **Edit**, **Pause/Activate**, **Restart** (only shown once expired or edited — resets the countdown on next Publish), and **Delete**.

### 7.2 Floating video tab

Manages the small draggable video bubble that floats above the WhatsApp button on every storefront page.

- Each video tile shows a live phone-style preview, title, and linked product.
- **+ New video**: Title, upload an MP4/MOV/WEBM (max 50MB), select the **Product** it should link to (required — the bubble is shoppable), an optional Instagram post URL, and a Sort order.
- **Edit / Pause/Activate / Delete** per video.

### 7.3 Homepage showcase tab

Same editing flow as Floating video, but these videos power the **"See H2R In Action"** carousel section on the homepage instead of the floating bubble.

### 7.4 Reviews

**Path:** `/admin/reviews` (nested under Marketing in the sidebar, shows a badge with the pending count).

Customer-submitted reviews land here as **Pending** and never appear on the site until you decide.

- **Filter chips:** Needs decision (pending), Posted on site (approved), Not posted (hidden), All — each with a live count.
- **Table columns:** From (name, location, "Customer submission" vs admin-added), Bat/review text (plus any customer-uploaded photo/video thumbnails — click to open full size), star rating, status, and a decision column.
- **For a pending review:** *Yes — post on site*, *No — don't post*, or *Edit* (to tweak the text/rating before deciding).
- **For an already-decided review:** Post on site / Unpublish, Edit, Delete.
- **+ Add review** lets you manually create a testimonial (name, location, text, rating, whether it's live, linked product name, sort order, and a **Featured on home** checkbox).

---

## 8. Reports

**Path:** `/admin/reports` — an interactive BI (business-intelligence) explorer, not static charts.

**Landing screen:** a searchable, filterable catalogue of report types, grouped by category (All / Sales / Payments / Activity / Customers) — e.g. Sales Overview, Sales by Day, Sales by Customer, Sales by Items, Sales by Order Status, Order Fulfillment, Payments Received, Payment Method Mix, Top Customers by Spend, Order Status Activity. Each row shows when you last opened it.

**Opening a report** drops you into the drill-down explorer:
- A date-range selector (Last 7 / 30 / 90 / 180 days).
- A breadcrumb trail at the top showing your current drill path (click any crumb to jump back).
- Four clickable KPI tiles — **Revenue**, **Orders**, **Avg Order Value**, **Payment success %** — each one is also a shortcut into that dimension's breakdown.
- A **Revenue by day** bar chart — click any bar to drill into that day's orders.
- Breakdown panels **By order status**, **By payment method**, **By product**, **By customer** — click any row to drill into just those orders.
- Drilling all the way down shows an **order list table**, and clicking an order in that list opens a **full order detail** view (customer, payment, itemised list).

Everything here is read-only reporting — it doesn't let you change order data (use **Online Orders** for that).

---

## 9. Integrations

**Path:** `/admin/integrations` — a reference page (not editable) documenting which external services this store depends on and what to configure:

- **Razorpay** — checkout payments. Needs `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` set on the server (live keys start with `rzp_live_…`); the webhook URL `/api/payments/razorpay/webhook` needs `RAZORPAY_WEBHOOK_SECRET` configured in the Razorpay dashboard for the `payment.captured` event.
- **Order email** — transactional emails (order confirmation, verification, password reset) send from your own mailbox via `SMTP_USER`/`SMTP_PASS`. The "client Gmail" (`STORE_EMAIL`) is only used as a reply-to/CC address — it never needs its own app password.
- **Shiprocket** — planned, not yet connected.
- **WhatsApp Business API** — planned, not yet connected.

---

## Appendix A — Order status reference

| Status | Meaning | Can move to |
|---|---|---|
| **Ordered** | Payment received, order just placed | Accepted, Cancelled |
| **Accepted** | Shop has accepted/confirmed the order | Packed, Cancelled |
| **Packed** | Ready for courier pickup — auto-prints the address label when you mark this | Shipped, Cancelled |
| **Shipped** | Handed to courier — requires courier name + tracking ID | Delivered, Cancelled |
| **Delivered** | Final state — no further changes possible | — |
| **Cancelled** | Terminal — no further changes possible | — |

Payment status is separate from order status: **COD Pending**, **Paid**, or **Refunded**.

## Appendix B — Practical tips

- **Print addresses vs. Print invoice are different documents.** "Print addresses" (bulk, Packed orders only) is a courier shipping label. "🧾 Invoice" is the customer-facing tax invoice/receipt. Don't confuse the two when handing paperwork to a courier.
- **Publishing in Marketing is not automatic.** If you upload a video/status and it isn't showing on the live site, check you clicked **Publish live** — edits are staged until then.
- **Store Billing and Online Orders are two separate ledgers.** Physical counter sales never appear in Online Orders/Billing, and vice versa. The Dashboard's "Shop sales (physical)" card is the only place they're shown side-by-side.
- **Categories and Collections are derived, not directly editable.** To change a category, edit the Category field on the relevant products in Inventory.
- **Change the default admin password** (`admin@h2rsports.in` / `admin123`) before taking real customer traffic — this is a known placeholder seeded for local development.
