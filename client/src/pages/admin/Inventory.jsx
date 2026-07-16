import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    id: '', name: '', tagline: '', price: 0, compareAt: '', 
    collection: '', category: '', badge: '', images: '', sizes: '', inStock: true
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProducts();
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

  const toggleStock = async (product) => {
    try {
      const newStockStatus = !product.inStock;
      await api.put(`/admin/products/${product.id}`, { inStock: newStockStatus });
      setProducts(products.map(p => p.id === product.id ? { ...p, inStock: newStockStatus } : p));
    } catch (err) {
      alert('Failed to update inventory status');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/admin/products/${productId}`);
      setProducts(products.filter(p => p.id !== productId));
    } catch (err) {
      alert('Failed to delete product');
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
        images: product.images ? product.images.join(', ') : '',
        sizes: product.sizes ? product.sizes.map(s => `${s.id}:${s.label}:${s.price}`).join(', ') : '',
        inStock: product.inStock !== false
      });
    } else {
      setEditingProduct(null);
      setFormData({
        id: '', name: '', tagline: '', price: 0, compareAt: '', 
        collection: '', category: '', badge: '', images: '', sizes: '', inStock: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
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
      // Create a specific config for multipart/form-data
      const res = await api.post('/admin/upload', data);
      if (res.data.urls) {
        const currentImages = formData.images ? formData.images.split(',').map(i => i.trim()).filter(i => i) : [];
        const newImages = [...currentImages, ...res.data.urls];
        setFormData({ ...formData, images: newImages.join(', ') });
      }
    } catch (err) {
      alert('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Process images and sizes
      const imagesArray = formData.images ? formData.images.split(',').map(i => i.trim()).filter(i => i) : [];
      let sizesArray = [];
      if (formData.sizes) {
        sizesArray = formData.sizes.split(',').map(s => {
          const parts = s.split(':');
          return { id: parts[0]?.trim(), label: parts[1]?.trim(), price: Number(parts[2]?.trim()) || formData.price };
        }).filter(s => s.id && s.label);
      }

      const payload = {
        name: formData.name,
        tagline: formData.tagline,
        price: Number(formData.price),
        compareAt: formData.compareAt ? Number(formData.compareAt) : null,
        collection: formData.collection,
        category: formData.category,
        badge: formData.badge,
        inStock: formData.inStock,
        images: imagesArray,
        sizes: sizesArray,
      };

      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/admin/products', { ...payload, id: formData.id.trim() });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--navy)' }}>Inventory Management</h1>
        <button 
          onClick={() => openModal()}
          style={{ padding: '0.75rem 1.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Add Product
        </button>
      </div>
      
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', overflowX: 'auto' }}>
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
            {products.map(product => (
              <tr key={product.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem' }}>
                  <img src={product.image} alt={product.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--navy)' }}>{product.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{product.id}</div>
                </td>
                <td style={{ padding: '1rem', color: '#475569' }}>{product.category}</td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>₹{product.price?.toLocaleString()}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '999px', 
                    fontSize: '0.85rem',
                    background: product.inStock ? '#dcfce7' : '#fee2e2',
                    color: product.inStock ? '#166534' : '#991b1b'
                  }}>
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
                <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => toggleStock(product)}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Stock
                  </button>
                  <button 
                    onClick={() => openModal(product)}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(product.id)}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--navy)' }}>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Product ID *</label>
                  <input required name="id" value={formData.id} onChange={handleFormChange} disabled={!!editingProduct} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Name *</label>
                  <input required name="name" value={formData.name} onChange={handleFormChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Price *</label>
                  <input required type="number" name="price" value={formData.price} onChange={handleFormChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Compare At Price</label>
                  <input type="number" name="compareAt" value={formData.compareAt} onChange={handleFormChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Collection *</label>
                  <input required name="collection" value={formData.collection} onChange={handleFormChange} placeholder="e.g. hard-tennis" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Category *</label>
                  <input required name="category" value={formData.category} onChange={handleFormChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Tagline</label>
                <input name="tagline" value={formData.tagline} onChange={handleFormChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Image URLs (comma separated)</label>
                <textarea name="images" value={formData.images} onChange={handleFormChange} rows={3} placeholder="/products/bat.png, https://example.com/bat2.jpg" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} disabled={uploading} style={{ fontSize: '0.85rem' }} />
                  {uploading && <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Uploading...</span>}
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Sizes (id:label:price, comma separated)</label>
                <textarea name="sizes" value={formData.sizes} onChange={handleFormChange} rows={2} placeholder="sh:Short Handle (SH):2799, lh:Long Handle:2899" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" name="inStock" checked={formData.inStock} onChange={handleFormChange} id="inStockCheckbox" />
                <label htmlFor="inStockCheckbox" style={{ fontSize: '0.9rem' }}>In Stock</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={closeModal} style={{ padding: '0.75rem 1.5rem', border: '1px solid #ccc', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
