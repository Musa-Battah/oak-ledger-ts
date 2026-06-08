'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import SearchableSelect from '@/components/SearchableSelect';

interface Supplier {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface Product {
  id: string;
  name: string;
  unit_price: number;
  sku?: string | null;
}

interface BillItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  product_id?: string;
}

export default function NewBill(): React.ReactElement {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: '',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    items: [{ description: '', quantity: 1, unit_price: 0, amount: 0, product_id: '' }] as BillItem[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<void> => {
    try {
      const [suppliersRes, productsRes] = await Promise.all([
        fetch('/api/purchases/suppliers'),
        fetch('/api/sales/products')
      ]);
      
      const suppliersData = await suppliersRes.json();
      const productsData = await productsRes.json();
      
      if (suppliersData.success) {
        setSuppliers(suppliersData.data || []);
      }
      if (productsData.success) {
        setProducts(productsData.data || []);
      }
    } catch (error) {
      toast.error('Error loading data');
    }
  };

  const handleAddSupplier = async (name: string): Promise<Supplier> => {
    const res = await fetch('/api/purchases/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const refreshRes = await fetch('/api/purchases/suppliers');
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setSuppliers(refreshData.data || []);
        }
        toast.success(`Supplier "${name}" added successfully`);
        return data.data;
      }
    }
    throw new Error('Failed to add supplier');
  };

  const handleAddProduct = async (name: string, additionalData?: { unit_price: number }): Promise<Product> => {
    const res = await fetch('/api/sales/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        unit_price: additionalData?.unit_price || 0 
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const refreshRes = await fetch('/api/sales/products');
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setProducts(refreshData.data || []);
        }
        toast.success(`Product "${name}" added successfully`);
        return data.data;
      }
    }
    throw new Error('Failed to add product');
  };

  const calculateTotals = (): { subtotal: number; tax: number; total: number } => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax = subtotal * 0.075;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const addItem = (): void => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0, amount: 0, product_id: '' }]
    });
  };

  const removeItem = (index: number): void => {
    if (formData.items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: keyof BillItem, value: string | number): void => {
    const newItems = [...formData.items];
    newItems[index][field] = value as never;
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleProductSelect = (index: number, productId: string): void => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...formData.items];
      newItems[index].product_id = product.id;
      newItems[index].description = product.name;
      newItems[index].unit_price = product.unit_price;
      newItems[index].amount = newItems[index].quantity * product.unit_price;
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }
    
    if (formData.items.some(item => !item.description || item.quantity <= 0 || item.unit_price <= 0)) {
      toast.error('Please fill in all item details (description, quantity, and price)');
      return;
    }
    
    setLoading(true);
    
    try {
      const totals = calculateTotals();
      const res = await fetch('/api/purchases/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: formData.supplier_id,
          date: formData.date,
          due_date: formData.due_date,
          notes: formData.notes,
          items: formData.items.map(({ description, quantity, unit_price, amount }) => ({
            description,
            quantity,
            unit_price,
            amount
          })),
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Bill created successfully!');
        router.push('/purchases/bills');
      } else {
        toast.error(data.error || 'Failed to create bill');
      }
    } catch (error) {
      toast.error('Error creating bill');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>New Bill</h1>
          <p>Record a bill from a supplier</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Supplier Information</h3>
            <div className="form-group">
              <label>Select Supplier *</label>
              <SearchableSelect
                options={suppliers}
                value={formData.supplier_id}
                onChange={(id) => setFormData({ ...formData, supplier_id: id })}
                onAddNew={handleAddSupplier}
                placeholder="Search or add supplier..."
                addNewLabel="+ Add New Supplier"
                entityType="supplier"
              />
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Bill Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Bill Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Items / Services</h3>
            <div className="table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Product / Service</th>
                    <th style={{ width: '15%' }}>Quantity</th>
                    <th style={{ width: '20%' }}>Unit Price (₦)</th>
                    <th style={{ width: '20%' }}>Amount (₦)</th>
                    <th style={{ width: '10%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <SearchableSelect
                          options={products}
                          value={item.product_id || ''}
                          onChange={(productId) => handleProductSelect(index, productId)}
                          onAddNew={handleAddProduct}
                          placeholder="Search or add product..."
                          addNewLabel="+ Add New Product"
                          entityType="product"
                        />
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Or type description manually"
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          step="1"
                          min="1"
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          step="100"
                          min="0"
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td>
                        ₦{item.amount.toLocaleString()}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="btn-danger"
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addItem} className="btn-secondary" style={{ marginTop: '1rem' }}>
              + Add Item
            </button>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Notes</h3>
            <div className="form-group">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Add any notes or terms..."
              />
            </div>
          </div>

          <div className="totals-section">
            <div className="totals-row">
              <span>Subtotal:</span>
              <span>₦{subtotal.toLocaleString()}</span>
            </div>
            <div className="totals-row">
              <span>VAT (7.5%):</span>
              <span>₦{tax.toLocaleString()}</span>
            </div>
            <div className="totals-row total">
              <span>Total:</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => router.back()} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}