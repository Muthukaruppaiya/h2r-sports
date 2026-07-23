import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { API_ORIGIN, mediaUrl } from '../../config/api.js';

function weightKey(w) {
  return `${w?.from || ''}-${w?.to || ''}-${w?.label || ''}`;
}

function weightsMatch(sent = [], saved = []) {
  if (sent.length !== saved.length) return false;
  const a = [...sent].map(weightKey).sort();
  const b = [...saved].map(weightKey).sort();
  return a.every((key, i) => key === b[i]);
}

const EMPTY_FORM = {
  id: '',
  name: '',
  tagline: '',
  price: 0,
  compareAt: '',
  collection: '',
  category: '',
  badge: '',
  willow: '',
  weight: '',
  madeIn: '',
  description: '',
  features: '',
  imageList: [],
  sizeRows: [{ id: '', label: '', price: '' }],
  weightRanges: [{ from: '', to: '' }],
  inStock: true,
  topSelling: false,
  mostLoved: false,
};

export default function Inventory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'products';
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  const categories = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      const key = (p.category || 'Uncategorized').trim() || 'Uncategorized';
      const row = map.get(key) || { name: key, products: 0, inStock: 0 };
      row.products += 1;
      if (p.inStock !== false) row.inStock += 1;
      map.set(key, row);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const collectionRows = useMemo(() => {
    return (collections || []).map((c) => {
      const count = products.filter((p) => p.collection === c.id).length;
      return { ...c, productCount: count };
    });
  }, [collections, products]);

  useEffect(() => {
    fetchProducts();
    fetchCollections();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await api.get('/collections');
      const list = (res.data.collections || []).map((c) => ({
        id: c.id || c.slug,
        label: c.name,
        category: c.name,
      }));
      setCollections(list);
    } catch (err) {
      console.error(err);
      setCollections([]);
    }
  };

  const toggleStock = async (product) => {
    try {
      const newStockStatus = !product.inStock;
      await api.put(`/admin/products/${product.id}`, { inStock: newStockStatus });
      setProducts(products.map((p) => (p.id === product.id ? { ...p, inStock: newStockStatus } : p)));
    } catch (err) {
      alert('Failed to update inventory status');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/admin/products/${productId}`);
      setProducts(products.filter((p) => p.id !== productId));
    } catch (err) {
      alert('Failed to delete product: ' + (err.message || ''));
    }
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        id: product.id,
        name: product.name || '',
        tagline: product.tagline || '',
        price: product.price || 0,
        compareAt: product.compareAt || '',
        collection: product.collection || '',
        category: product.category || '',
        badge: product.badge || '',
        willow: product.willow || '',
        weight: product.weight || '',
        madeIn: product.madeIn || '',
        description: product.description || '',
        features: Array.isArray(product.features) ? product.features.join('\n') : '',
        imageList: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
        sizeRows: product.sizes?.length
          ? product.sizes.map((s) => ({
              id: s.id || '',
              label: s.label || '',
              price: String(s.price ?? product.price ?? ''),
            }))
          : [{ id: '', label: '', price: String(product.price || '') }],
        weightRanges: product.weights?.length
          ? product.weights.map((w) => ({
              from: w.from || '',
              to: w.to || '',
            }))
          : [{ from: '', to: '' }],
        inStock: product.inStock !== false,
        topSelling: !!product.topSelling,
        mostLoved: !!product.mostLoved,
      });
    } else {
      setEditingProduct(null);
      setFormData({ ...EMPTY_FORM, sizeRows: [{ id: '', label: '', price: '' }] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'collection') {
        const match = collections.find((c) => c.id === value);
        if (match) next.category = match.category;
      }
      return next;
    });
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const data = new FormData();
    for (let i = 0; i < files.length; i++) {
      data.append('images', files[i]);
    }

    setUploading(true);
    try {
      const res = await api.post('/admin/upload', data);
      if (res.data.urls?.length) {
        setFormData((prev) => ({
          ...prev,
          imageList: [...(prev.imageList || []), ...res.data.urls],
        }));
      }
    } catch (err) {
      alert('Failed to upload images: ' + (err.message || ''));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const imagesArray = (formData.imageList || []).map((i) => String(i).trim()).filter(Boolean);
      const featuresArray = formData.features
        ? formData.features
            .split('\n')
            .map((line) => line.replace(/^[\s*•\-]+/, '').trim())
            .filter(Boolean)
        : [];

      let sizesArray = (formData.sizeRows || [])
        .map((row) => {
          const id = String(row.id || '').trim() || String(row.label || '').trim().toLowerCase().replace(/\s+/g, '-');
          const label = String(row.label || '').trim();
          const price = Number(row.price);
          if (!id || !label) return null;
          return {
            id,
            label,
            price: Number.isFinite(price) && price > 0 ? price : Number(formData.price) || 0,
          };
        })
        .filter(Boolean);

      if (!sizesArray.length) {
        sizesArray = [
          {
            id: 'default',
            label: 'Standard',
            price: Number(formData.price),
          },
        ];
      }

      const incompleteWeight = (formData.weightRanges || []).some((row) => {
        const from = String(row.from || '').replace(/[^\d.]/g, '').trim();
        const to = String(row.to || '').replace(/[^\d.]/g, '').trim();
        return (from && !to) || (!from && to);
      });
      if (incompleteWeight) {
        throw new Error('Fill both From and To for every weight range (e.g. 850 and 950)');
      }

      const incompleteSize = (formData.sizeRows || []).some((row) => {
        const id = String(row.id || '').trim();
        const label = String(row.label || '').trim();
        const price = String(row.price || '').trim();
        const any = id || label || price;
        return any && (!label || !price);
      });
      if (incompleteSize) {
        throw new Error('Each size needs Label and Price (ID auto-fills from label if empty)');
      }

      const weightsArray = (formData.weightRanges || [])
        .map((row) => {
          const from = String(row.from || '').replace(/[^\d.]/g, '').trim();
          const to = String(row.to || '').replace(/[^\d.]/g, '').trim();
          if (!from || !to) return null;
          const fromNum = Number(from);
          const toNum = Number(to);
          if (!Number.isFinite(fromNum) || !Number.isFinite(toNum)) return null;
          const lo = Math.min(fromNum, toNum);
          const hi = Math.max(fromNum, toNum);
          const fromStr = String(lo);
          const toStr = String(hi);
          return {
            id: `${fromStr}-${toStr}`,
            from: fromStr,
            to: toStr,
            label: `${fromStr}g – ${toStr}g`,
          };
        })
        .filter(Boolean);

      const payload = {
        name: formData.name.trim(),
        tagline: formData.tagline.trim(),
        price: Number(formData.price),
        compareAt: formData.compareAt ? Number(formData.compareAt) : null,
        collection: formData.collection,
        category: formData.category.trim(),
        badge: formData.badge.trim(),
        willow: formData.willow.trim(),
        weight: formData.weight.trim() || weightsArray[0]?.label || '',
        madeIn: formData.madeIn.trim() || 'Tamil Nadu, India',
        description: formData.description.trim(),
        features: featuresArray,
        inStock: formData.inStock,
        topSelling: formData.topSelling,
        mostLoved: formData.mostLoved,
        images: imagesArray,
        sizes: sizesArray,
        weights: weightsArray,
      };

      let savedProduct = null;
      if (editingProduct) {
        const res = await api.put(`/admin/products/${editingProduct.id}`, payload);
        savedProduct = res.data?.product;
      } else {
        const id = formData.id.trim().toLowerCase().replace(/\s+/g, '-');
        if (!id) throw new Error('Product ID is required');
        const res = await api.post('/admin/products', { ...payload, id });
        savedProduct = res.data?.product;
      }

      const savedWeights = Array.isArray(savedProduct?.weights) ? savedProduct.weights : [];
      if (!weightsMatch(weightsArray, savedWeights)) {
        throw new Error(
          `Weight ranges did not save on ${API_ORIGIN}. ` +
            'Start/restart the local API (server folder: npm run dev), or deploy the updated server to Render.'
        );
      }

      closeModal();
      fetchProducts();
    } catch (err) {
      alert('Failed to save product: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div className="adm-empty">Loading inventory…</div>;

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <h1>Items</h1>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Catalogue products, categories, and collections. API: {API_ORIGIN}
          </p>
        </div>
        {tab === 'products' && (
          <div className="adm-page__actions">
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => openModal()}>
              + Add Product
            </button>
          </div>
        )}
      </div>

      <div className="adm-tabs">
        {[
          { id: 'products', label: 'Inventory', to: '/admin/inventory' },
          { id: 'categories', label: 'Categories', to: '/admin/inventory?tab=categories' },
          { id: 'collections', label: 'Collections', to: '/admin/inventory?tab=collections' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`adm-tabs__btn${tab === t.id || (t.id === 'products' && tab === 'products') ? ' is-active' : ''}`}
            onClick={() => navigate(t.to)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'categories' && (
        <div className="adm-panel">
          <div className="adm-panel__head">
            <h2>Categories</h2>
          </div>
          {categories.length === 0 ? (
            <div className="adm-empty">No categories yet — add products first.</div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Products</th>
                    <th>In stock</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.name}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</td>
                      <td>{c.products}</td>
                      <td>{c.inStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'collections' && (
        <div className="adm-panel">
          <div className="adm-panel__head">
            <h2>Collections</h2>
          </div>
          {collectionRows.length === 0 ? (
            <div className="adm-empty">No collections found.</div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th>ID</th>
                    <th>Products</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionRows.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.label || c.name || c.id}</td>
                      <td style={{ color: '#64748b' }}>{c.id}</td>
                      <td>{c.productCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'products' && (
        <div className="adm-panel">
          <div className="adm-panel__head">
            <h2>Products</h2>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{products.length} items</span>
          </div>
          {products.length === 0 ? (
            <div className="adm-empty">No products found. Click “Add Product” to create one.</div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>Image</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <img
                          src={mediaUrl(product.image || product.images?.[0])}
                          alt=""
                          className="inv-thumb"
                          onError={(e) => {
                            e.currentTarget.src = '/products/placeholders/front.svg';
                          }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{product.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{product.id}</div>
                      </td>
                      <td>{product.category || '—'}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(product.price || 0).toLocaleString()}</td>
                      <td>
                        <span className={`adm-pill ${product.inStock !== false ? 'adm-pill--ok' : 'adm-pill--bad'}`}>
                          {product.inStock !== false ? 'In stock' : 'Out of stock'}
                        </span>
                      </td>
                      <td>
                        <div className="inv-row-actions">
                          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => toggleStock(product)}>
                            Stock
                          </button>
                          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => openModal(product)}>
                            Edit
                          </button>
                          <button type="button" className="adm-btn adm-btn--danger" onClick={() => handleDelete(product.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="adm-drawer-backdrop" onClick={closeModal} role="presentation">
          <aside
            className="adm-drawer inv-product-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={editingProduct ? 'Edit product' : 'Add product'}
          >
            <div className="adm-drawer__head">
              <div>
                <strong>{editingProduct ? 'Edit product' : 'Add product'}</strong>
                <p className="inv-drawer-sub">
                  {editingProduct ? editingProduct.id : 'Fill sections below — sizes & weights use row editors'}
                </p>
              </div>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="adm-drawer__body inv-product-form" onSubmit={handleSave}>
              <section className="inv-section">
                <header className="inv-section__head">
                  <h3>Basics</h3>
                  <p>ID, name, pricing, and catalogue grouping</p>
                </header>
                <div className="adm-form-grid">
                  <div className="adm-field">
                    <label>Product ID *</label>
                    <input
                      required
                      name="id"
                      value={formData.id}
                      onChange={handleFormChange}
                      disabled={!!editingProduct}
                      placeholder="karrupu-edition"
                    />
                  </div>
                  <div className="adm-field">
                    <label>Name *</label>
                    <input
                      required
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="H2R Karrupu Edition"
                    />
                  </div>
                  <div className="adm-field">
                    <label>Sale price (₹) *</label>
                    <input
                      required
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleFormChange}
                      placeholder="3300"
                      min="0"
                    />
                  </div>
                  <div className="adm-field">
                    <label>Compare / MRP (₹)</label>
                    <input
                      type="number"
                      name="compareAt"
                      value={formData.compareAt}
                      onChange={handleFormChange}
                      placeholder="3500"
                      min="0"
                    />
                  </div>
                  <div className="adm-field">
                    <label>Collection *</label>
                    {collections.length ? (
                      <select name="collection" value={formData.collection} onChange={handleFormChange} required>
                        <option value="">Select collection</option>
                        {collections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        required
                        name="collection"
                        value={formData.collection}
                        onChange={handleFormChange}
                        placeholder="collection-id"
                      />
                    )}
                  </div>
                  <div className="adm-field">
                    <label>Category *</label>
                    <input
                      required
                      name="category"
                      value={formData.category}
                      onChange={handleFormChange}
                      placeholder="Hard tennis bats"
                    />
                  </div>
                  <div className="adm-field">
                    <label>Tagline</label>
                    <input
                      name="tagline"
                      value={formData.tagline}
                      onChange={handleFormChange}
                      placeholder="Premium Black Edition"
                    />
                  </div>
                  <div className="adm-field">
                    <label>Badge</label>
                    <input name="badge" value={formData.badge} onChange={handleFormChange} placeholder="Sale" />
                  </div>
                </div>
              </section>

              <section className="inv-section">
                <header className="inv-section__head">
                  <h3>Specs</h3>
                  <p>Willow, origin, and optional weight note for the product card</p>
                </header>
                <div className="adm-form-grid">
                  <div className="adm-field">
                    <label>Willow</label>
                    <input
                      name="willow"
                      value={formData.willow}
                      onChange={handleFormChange}
                      placeholder="Premium Kashmir Willow"
                    />
                  </div>
                  <div className="adm-field">
                    <label>Weight note</label>
                    <input
                      name="weight"
                      value={formData.weight}
                      onChange={handleFormChange}
                      placeholder="Under 1020g"
                    />
                  </div>
                  <div className="adm-field adm-field--full">
                    <label>Made in</label>
                    <input
                      name="madeIn"
                      value={formData.madeIn}
                      onChange={handleFormChange}
                      placeholder="Tamil Nadu, India"
                    />
                  </div>
                  <div className="adm-field adm-field--full">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      rows={3}
                      placeholder="Short product story for the detail page…"
                    />
                  </div>
                  <div className="adm-field adm-field--full">
                    <label>Features (one per line)</label>
                    <textarea
                      name="features"
                      value={formData.features}
                      onChange={handleFormChange}
                      rows={5}
                      placeholder={'Premium Black Edition Design\nUnder 1020g Weight\nNatural Straight Grains'}
                    />
                  </div>
                </div>
              </section>

              <section className="inv-section">
                <header className="inv-section__head">
                  <h3>Sizes</h3>
                  <p>Each size has its own ID, label, and price — customers pick these on checkout</p>
                </header>
                <div className="inv-row-list">
                  <div className="inv-row-list__labels">
                    <span>ID</span>
                    <span>Label</span>
                    <span>Price (₹)</span>
                    <span />
                  </div>
                  {(formData.sizeRows || [{ id: '', label: '', price: '' }]).map((row, index) => (
                    <div key={`size-${index}`} className="inv-row">
                      <input
                        placeholder="35"
                        value={row.id}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => {
                            const next = [...(prev.sizeRows || [])];
                            next[index] = { ...next[index], id: value };
                            return { ...prev, sizeRows: next };
                          });
                        }}
                      />
                      <input
                        placeholder='35"'
                        value={row.label}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => {
                            const next = [...(prev.sizeRows || [])];
                            const cur = { ...next[index], label: value };
                            if (!String(cur.id || '').trim() && value.trim()) {
                              cur.id = value.trim().toLowerCase().replace(/\s+/g, '-');
                            }
                            next[index] = cur;
                            return { ...prev, sizeRows: next };
                          });
                        }}
                      />
                      <input
                        inputMode="decimal"
                        placeholder={String(formData.price || '3300')}
                        value={row.price}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => {
                            const next = [...(prev.sizeRows || [])];
                            next[index] = { ...next[index], price: value };
                            return { ...prev, sizeRows: next };
                          });
                        }}
                      />
                      <button
                        type="button"
                        className="adm-btn adm-btn--danger inv-row__remove"
                        onClick={() => {
                          setFormData((prev) => {
                            const next = (prev.sizeRows || []).filter((_, i) => i !== index);
                            return {
                              ...prev,
                              sizeRows: next.length ? next : [{ id: '', label: '', price: '' }],
                            };
                          });
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="inv-add-row"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      sizeRows: [
                        ...(prev.sizeRows || []),
                        { id: '', label: '', price: String(prev.price || '') },
                      ],
                    }))
                  }
                >
                  + Add size
                </button>
              </section>

              <section className="inv-section">
                <header className="inv-section__head">
                  <h3>Weight ranges</h3>
                  <p>From–to grams. Example: 850 to 950 → “850g – 950g”</p>
                </header>
                <div className="inv-row-list">
                  <div className="inv-row-list__labels inv-row-list__labels--weight">
                    <span>From (g)</span>
                    <span />
                    <span>To (g)</span>
                    <span />
                  </div>
                  {(formData.weightRanges || [{ from: '', to: '' }]).map((row, index) => (
                    <div key={`weight-${index}`} className="inv-row inv-row--weight">
                      <input
                        inputMode="numeric"
                        placeholder="850"
                        value={row.from}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => {
                            const next = [...(prev.weightRanges || [])];
                            next[index] = { ...next[index], from: value };
                            return { ...prev, weightRanges: next };
                          });
                        }}
                      />
                      <span className="inv-row__sep">to</span>
                      <input
                        inputMode="numeric"
                        placeholder="950"
                        value={row.to}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => {
                            const next = [...(prev.weightRanges || [])];
                            next[index] = { ...next[index], to: value };
                            return { ...prev, weightRanges: next };
                          });
                        }}
                      />
                      <button
                        type="button"
                        className="adm-btn adm-btn--danger inv-row__remove"
                        onClick={() => {
                          setFormData((prev) => {
                            const next = (prev.weightRanges || []).filter((_, i) => i !== index);
                            return {
                              ...prev,
                              weightRanges: next.length ? next : [{ from: '', to: '' }],
                            };
                          });
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="inv-add-row"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      weightRanges: [...(prev.weightRanges || []), { from: '', to: '' }],
                    }))
                  }
                >
                  + Add weight range
                </button>
              </section>

              <section className="inv-section">
                <header className="inv-section__head">
                  <h3>Images</h3>
                  <p>Upload files or paste a URL. First image is the catalogue thumbnail.</p>
                </header>
                <div className="inv-images-toolbar">
                  <label className={`adm-btn adm-btn--ghost${uploading ? ' is-disabled' : ''}`}>
                    {uploading ? 'Uploading…' : 'Upload images'}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      hidden
                    />
                  </label>
                  <div className="inv-url-add">
                    <input
                      id="inv-image-url"
                      placeholder="/batimages/bat1.webp or https://…"
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        const value = e.currentTarget.value.trim();
                        if (!value) return;
                        setFormData((prev) => ({
                          ...prev,
                          imageList: [...(prev.imageList || []), value],
                        }));
                        e.currentTarget.value = '';
                      }}
                    />
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost"
                      onClick={() => {
                        const el = document.getElementById('inv-image-url');
                        const value = el?.value?.trim();
                        if (!value) return;
                        setFormData((prev) => ({
                          ...prev,
                          imageList: [...(prev.imageList || []), value],
                        }));
                        if (el) el.value = '';
                      }}
                    >
                      Add URL
                    </button>
                  </div>
                </div>
                {(formData.imageList || []).length === 0 ? (
                  <div className="inv-images-empty">No images yet — upload or paste a path.</div>
                ) : (
                  <div className="inv-images-grid">
                    {(formData.imageList || []).map((img, index) => (
                      <div key={`${img}-${index}`} className="inv-image-card">
                        <img
                          src={mediaUrl(img)}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.src = '/products/placeholders/front.svg';
                          }}
                        />
                        <div className="inv-image-card__meta">
                          <span title={img}>{img}</span>
                          <button
                            type="button"
                            className="adm-btn adm-btn--danger"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                imageList: (prev.imageList || []).filter((_, i) => i !== index),
                              }))
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="inv-section inv-section--flags">
                <header className="inv-section__head">
                  <h3>Visibility</h3>
                  <p>Stock and homepage highlights</p>
                </header>
                <div className="inv-flags">
                  <label>
                    <input type="checkbox" name="inStock" checked={formData.inStock} onChange={handleFormChange} />
                    In stock
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="topSelling"
                      checked={formData.topSelling}
                      onChange={handleFormChange}
                    />
                    Top selling
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="mostLoved"
                      checked={formData.mostLoved}
                      onChange={handleFormChange}
                    />
                    Most loved
                  </label>
                </div>
              </section>

              <div className="inv-form-foot">
                <button type="button" className="adm-btn adm-btn--ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="adm-btn adm-btn--primary">
                  Save product
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
