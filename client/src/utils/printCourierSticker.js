import { BRAND } from './india';
import { companyHasAddress, fetchCompany, mergeCompany } from './companyProfile';

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function escLabel(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c])
  );
}

export async function printAddressLabels(orders) {
  const win = window.open('', '_blank', 'width=720,height=980');
  if (!win) {
    alert('Allow pop-ups to print courier stickers');
    return;
  }

  const company = mergeCompany(await fetchCompany());
  const hasFrom = companyHasAddress(company);

  const pages = orders
    .map((order, index) => {
      const s = order.shipping || {};
      const c = order.customer || {};
      const isCod = order.paymentMethod === 'cod' || order.paymentStatus === 'pending_cod';
      const itemCount = (order.items || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
      const orderNo = String(order.orderId || '').toUpperCase();

      return `
        <section class="sheet">
          <div class="sticker">
            <header class="sticker__head">
              <div>
                <div class="sticker__brand">${escLabel(company.name || BRAND.name)}</div>
                <div class="sticker__sub">${escLabel(company.tagline || 'Cricket bats · India')}</div>
              </div>
              <div class="pay ${isCod ? 'pay--cod' : 'pay--paid'}">
                ${isCod ? `COD<br/><b>${money(order.total)}</b>` : 'PREPAID<br/><b>DO NOT COLLECT</b>'}
              </div>
            </header>

            <div class="row">
              <div class="from">
                <div class="tag">Ship from</div>
                ${
                  hasFrom
                    ? `<strong>${escLabel(company.legalName || company.name)}</strong>
                       <p>
                         ${escLabel(company.line1)}${company.line2 ? `<br/>${escLabel(company.line2)}` : ''}<br/>
                         ${escLabel([company.city, company.state].filter(Boolean).join(', '))}${
                           company.pincode ? ` — ${escLabel(company.pincode)}` : ''
                         }
                         ${company.phone ? `<br/>Ph: ${escLabel(company.phone)}` : ''}
                         ${company.gstin ? `<br/>GSTIN: ${escLabel(company.gstin)}` : ''}
                       </p>`
                    : `<strong>${escLabel(company.name)}</strong>
                       <p>${escLabel(company.phone)}<br/>${escLabel(company.email)}</p>`
                }
              </div>
              <div class="pin">
                <div class="tag">PIN</div>
                <div class="pin__num">${escLabel(s.pincode || '—')}</div>
                <div class="pin__city">${escLabel(s.city || '')}</div>
              </div>
            </div>

            <div class="to">
              <div class="tag">Ship to</div>
              <div class="to__name">${escLabel(c.name)}</div>
              <p>
                ${escLabel(s.addressLine1)}<br/>
                ${s.addressLine2 ? `${escLabel(s.addressLine2)}<br/>` : ''}
                ${escLabel(s.city)}, ${escLabel(s.state)} — ${escLabel(s.pincode)}
              </p>
              <div class="to__phone">☎ ${escLabel(c.phone || '—')}</div>
            </div>

            <div class="oid">
              <span>ORDER</span>
              <strong>${escLabel(orderNo)}</strong>
              <em>${index + 1}/${orders.length}</em>
            </div>

            <div class="items">
              <strong>${itemCount} item${itemCount === 1 ? '' : 's'}</strong>
              ${(order.items || [])
                .map(
                  (i) =>
                    `<div>${escLabel(i.qty)}× ${escLabel(i.name)}${
                      i.sizeLabel ? ` · ${escLabel(i.sizeLabel)}` : ''
                    }${i.weightLabel ? ` · ${escLabel(i.weightLabel)}` : ''}</div>`
                )
                .join('')}
            </div>

            <footer class="sticker__foot">
              HANDLE WITH CARE · CRICKET BAT · ${escLabel(company.phone || BRAND.phone)}
            </footer>
          </div>
        </section>
      `;
    })
    .join('');

  win.document.write(`<!doctype html><html><head><title>Courier stickers</title>
    <style>
      @page { size: A6 portrait; margin: 6mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0b1f33; background: #fff; }
      .sheet {
        width: 100%;
        min-height: 100vh;
        page-break-after: always;
        break-after: page;
        display: flex;
        align-items: flex-start;
        justify-content: center;
      }
      .sheet:last-child { page-break-after: auto; break-after: auto; }
      .sticker {
        width: 100%;
        max-width: 105mm;
        border: 2.5px solid #0b1f33;
        border-radius: 6px;
        overflow: hidden;
      }
      .sticker__head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 12px;
        background: #0b1f33;
        color: #fff;
        align-items: center;
      }
      .sticker__brand { font-size: 16px; font-weight: 850; letter-spacing: 0.04em; text-transform: uppercase; }
      .sticker__sub { font-size: 10px; opacity: 0.8; margin-top: 2px; }
      .pay {
        min-width: 92px;
        text-align: center;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.04em;
        padding: 6px 8px;
        border-radius: 4px;
        line-height: 1.25;
      }
      .pay b { font-size: 11px; }
      .pay--paid { background: #bbf7d0; color: #14532d; }
      .pay--cod { background: #fecaca; color: #7f1d1d; }
      .row { display: grid; grid-template-columns: 1.4fr 0.8fr; border-bottom: 1.5px solid #0b1f33; }
      .from, .pin, .to, .oid, .items { padding: 10px 12px; }
      .tag { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; }
      .from strong, .to__name { display: block; margin: 3px 0 4px; }
      .from p, .to p, .items div { margin: 0; font-size: 11.5px; line-height: 1.45; color: #1e293b; }
      .pin { background: #f8fafc; text-align: center; border-left: 1.5px solid #0b1f33; }
      .pin__num { font-size: 26px; font-weight: 900; letter-spacing: 0.06em; margin-top: 4px; }
      .pin__city { font-size: 11px; font-weight: 700; color: #334155; }
      .to { border-bottom: 1.5px solid #0b1f33; }
      .to__name { font-size: 20px; font-weight: 850; line-height: 1.15; }
      .to__phone { margin-top: 8px; font-size: 14px; font-weight: 800; }
      .oid {
        display: flex;
        align-items: baseline;
        gap: 10px;
        background: #0b1f33;
        color: #fff;
      }
      .oid span { font-size: 10px; letter-spacing: 0.08em; }
      .oid strong { font-family: Consolas, ui-monospace, monospace; font-size: 16px; letter-spacing: 0.08em; flex: 1; }
      .oid em { font-style: normal; font-size: 11px; opacity: 0.7; }
      .items strong { display: block; font-size: 11px; margin-bottom: 4px; }
      .sticker__foot {
        padding: 7px 12px;
        background: #e2e8f0;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-align: center;
      }
      @media print {
        .sheet { min-height: auto; height: 100vh; }
      }
    </style></head><body>${pages}
    <script>window.onload = () => { setTimeout(() => window.print(), 250); }</script>
    </body></html>`);
  win.document.close();
}
