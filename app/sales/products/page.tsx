'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  unit_price: number;
  cost: number | null;
  is_active: boolean;
}

export default function ProductsPage(): React.ReactElement {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    unit_price: '',
    cost: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async (): Promise<void> => {
    try {
      const res = await fetch('/api/sales/products');
      const data = await res.json();
      
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (error) {
      toast.error('Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/sales/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          unit_price: parseFloat(formData.unit_price),
          cost: formData.cost ? parseFloat(formData.cost) : null
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Product created successfully');
        setShowForm(false);
        setFormData({ name: '', description: '', sku: '', unit_price: '', cost: '' });
        fetchProducts();
      } else {
        toast.error(data.error || 'Failed to create product');
      }
    } catch (error) {
      toast.error('Error creating product');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Products & Services</h1>
          <p>Manage your inventory and service catalog</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Product'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="card-title">Create New Product</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>SKU (Stock Keeping Unit)</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="PROD-001"
              />
            </div>
            <div className="form-group">
              <label>Selling Price (₦) *</label>
              <input
                type="number"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                required
                step="100"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Cost Price (₦)</label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                step="100"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Product description..."
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Save Product</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            <div className="empty-title" style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No products yet
            </div>
            <div className="empty-description" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Add your first product or service
            </div>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              Create Product
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Selling Price</th>
                  <th>Cost</th>
                  <th>Margin</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const margin = product.unit_price - (product.cost || 0);
                  const marginPercent = product.cost ? (margin / product.unit_price * 100).toFixed(1) : 0;
                  
                  return (
                    <tr key={product.id}>
                      <td><code>{product.sku || '-'}</code></td>
                      <td><strong>{product.name}</strong></td>
                      <td>{product.description?.substring(0, 50) || '-'}</td>
                      <td className="text-success">₦{product.unit_price.toLocaleString()}</td>
                      <td className="text-muted">₦{(product.cost || 0).toLocaleString()}</td>
                      <td className={margin > 0 ? 'text-success' : 'text-danger'}>
                        {marginPercent}% (₦{margin.toLocaleString()})
                      </td>
                      <td>
                        <span className="badge badge-success">Active</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}