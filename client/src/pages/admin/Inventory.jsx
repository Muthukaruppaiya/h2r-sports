import { useEffect, useState } from 'react';
import api from '../../api/client';
import { mediaUrl } from '../../config/api.js';

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
  images: '',
  sizes: '',
  inStock: true,
  topSelling: false,
  mostLoved: false,
};

const inputStyle = {
  width: '100%',
  padding: '0.55rem 0.65rem',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '0.9rem',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  marginBottom: '0.3rem',
  color: '#334155',
};

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

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
        images: product.images ? product.images.join(', ') : '',
        sizes: product.sizes
          ? product.sizes.map((s) => `${s.id}:${s.label}:${s.price}`).join(', ')
          : '',
        inStock: product.inStock !== false,
        topSelling: !!product.topSelling,
        mostLoved: !!product.mostLoved,
      });
    } else {
      setEditingProduct(null);
      setFormData({ ...EMPTY_FORM });
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
      if (res.data.urls) {
        const currentImages = formData.images
          ? formData.images.split(',').map((i) => i.trim()).filter(Boolean)
          : [];
        const newImages = [...currentImages, ...res.data.urls];
        setFormData({ ...formData, images: newImages.join(', ') });
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
      const imagesArray = formData.images
        ? formData.images.split(',').map((i) => i.trim()).filter(Boolean)
        : [];
      const featuresArray = formData.features
        ? formData.features
            .split('\n')
            .map((line) => line.replace(/^[\s*•\-]+/, '').trim())
            .filter(Boolean)
        : [];

      let sizesArray = [];
      if (formData.sizes) {
        sizesArray = formData.sizes
          .split(',')
          .map((s) => {
            const parts = s.split(':');
            return {
              id: parts[0]?.trim(),
              label: parts[1]?.trim(),
              price: Number(parts[2]?.trim()) || Number(formData.price),
            };
          })
          .filter((s) => s.id && s.label);
      }

      if (!sizesArray.length) {
        sizesArray = [
          {
            id: 'default',
            label: 'Standard',
            price: Number(formData.price),
          },
        ];
      }

      const payload = {
        name: formData.name.trim(),
        tagline: formData.tagline.trim(),
        price: Number(formData.price),
        compareAt: formData.compareAt ? Number(formData.compareAt) : null,
        collection: formData.collection,
        category: formData.category.trim(),
        badge: formData.badge.trim(),
        willow: formData.willow.trim(),
        weight: formData.weight.trim(),
        madeIn: formData.madeIn.trim() || 'Tamil Nadu, India',
        description: formData.description.trim(),
        features: featuresArray,
        inStock: formData.inStock,
        topSelling: formData.topSelling,
        mostLoved: formData.mostLoved,
        images: imagesArray,
        sizes: sizesArray,
      };

      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct.id}`, payload);
      } else {
        const id = formData.id.trim().toLowerCase().replace(/\s+/g, '-');
        if (!id) throw new Error('Product ID is required');
        await api.post('/admin/products', { ...payload, id });
      }
      closeModal();
      fetchProducts();
    } catch (err) {
      alert('Failed to save product: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div>Loading inventory...</div>;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ color: 'var(--navy)', margin: 0 }}>Inventory Management</h1>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Match WhatsApp catalog fields: name, price, compare price, willow, weight, sizes, features, images.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          + Add Product
        </button>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '1rem', color: '#475569', width: '60px' }}>Image</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Product</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Category</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Price</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Status</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem' }}>
                  <img
                    src={mediaUrl(product.image || product.images?.[0])}
                    alt={product.name}
                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', background: '#f1f5f9' }}
                    onError={(e) => {
                      e.currentTarget.src = '/products/placeholders/front.svg';
                    }}
                  />
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--navy)' }}>{product.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{product.id}</div>
                </td>
                <td style={{ padding: '1rem', color: '#475569' }}>{product.category}</td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>₹{product.price?.toLocaleString()}</td>
                <td style={{ padding: '1rem' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      background: product.inStock ? '#dcfce7' : '#fee2e2',
                      color: product.inStock ? '#166534' : '#991b1b',
                    }}
                  >
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
                <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => toggleStock(product)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal(product)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No products found. Click “Add Product” and copy fields from WhatsApp catalog.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ marginBottom: '0.35rem', color: 'var(--navy)' }}>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.85rem' }}>
              Example: H2R Karrupu Edition — price 3300, compare 3500, willow Kashmir Willow, weight Under 1020g, sizes 35 & 36.
            </p>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                <div>
                  <label style={labelStyle}>Product ID *</label>
                  <input
                    required
                    name="id"
                    value={formData.id}
                    onChange={handleFormChange}
                    disabled={!!editingProduct}
                    placeholder="karrupu-edition"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Name * (WhatsApp title)</label>
                  <input
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="H2R Karrupu Edition"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                <div>
                  <label style={labelStyle}>Sale Price * (₹)</label>
                  <input
                    required
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleFormChange}
                    placeholder="3300"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Compare / MRP (₹ strikethrough)</label>
                  <input
                    type="number"
                    name="compareAt"
                    value={formData.compareAt}
                    onChange={handleFormChange}
                    placeholder="3500"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                <div>
                  <label style={labelStyle}>Collection *</label>
                  {collections.length ? (
                    <select name="collection" value={formData.collection} onChange={handleFormChange} style={inputStyle} required>
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
                      placeholder="collection-id (from DB)"
                      style={inputStyle}
                    />
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Category label *</label>
                  <input
                    required
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.9rem' }}>
                <div>
                  <label style={labelStyle}>Willow</label>
                  <input
                    name="willow"
                    value={formData.willow}
                    onChange={handleFormChange}
                    placeholder="Premium Kashmir Willow"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Weight</label>
                  <input
                    name="weight"
                    value={formData.weight}
                    onChange={handleFormChange}
                    placeholder="Under 1020g"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Made in</label>
                  <input
                    name="madeIn"
                    value={formData.madeIn}
                    onChange={handleFormChange}
                    placeholder="Tamil Nadu, India"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Tagline / badge text</label>
                <input
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleFormChange}
                  placeholder="Premium Black Edition"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Badge (optional)</label>
                <input
                  name="badge"
                  value={formData.badge}
                  onChange={handleFormChange}
                  placeholder="Sale"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Premium black edition hard tennis bat…"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Features / details (one per line — from WhatsApp bullets)</label>
                <textarea
                  name="features"
                  value={formData.features}
                  onChange={handleFormChange}
                  rows={6}
                  placeholder={`Premium Black Edition Design\nUnder 1020g Weight\nAvailable in 35" & 36"\n10X Pressed for superior durability\nNatural Straight Grains\nPerfectly Well Balanced Pickup\nExcellent Curve for effortless stroke play\nBuilt for Hard-Hitting Performance\nPremium Kashmir Willow`}
                  style={{ ...inputStyle, fontFamily: 'inherit', lineHeight: 1.45 }}
                />
              </div>

              <div>
                <label style={labelStyle}>Sizes (id:label:price, comma separated)</label>
                <textarea
                  name="sizes"
                  value={formData.sizes}
                  onChange={handleFormChange}
                  rows={2}
                  placeholder={'35:35":3300, 36:36":3300'}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Images</label>
                <textarea
                  name="images"
                  value={formData.images}
                  onChange={handleFormChange}
                  rows={2}
                  placeholder="Upload below, or paste URLs: /batimages/bat1.webp, https://…"
                  style={inputStyle}
                />
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                  {uploading && <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Uploading…</span>}
                </div>
                {formData.images && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.65rem' }}>
                    {formData.images.split(',').map((img) => img.trim()).filter(Boolean).map((img) => (
                      <img
                        key={img}
                        src={mediaUrl(img)}
                        alt=""
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                  <input type="checkbox" name="inStock" checked={formData.inStock} onChange={handleFormChange} />
                  In stock
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                  <input type="checkbox" name="topSelling" checked={formData.topSelling} onChange={handleFormChange} />
                  Top selling
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                  <input type="checkbox" name="mostLoved" checked={formData.mostLoved} onChange={handleFormChange} />
                  Most loved
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '0.75rem 1.25rem',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
