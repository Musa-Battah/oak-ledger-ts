'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import SearchableSelect from '@/components/SearchableSelect';

interface Customer {
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

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  product_id?: string;
}

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    customer_id: '',
    date: '',
    due_date: '',
    notes: '',
    items: [] as InvoiceItem[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoiceRes, customersRes, productsRes] = await Promise.all([
        fetch(`/api/sales/invoices/${params.id}`),
        fetch('/api/sales/customers'),
        fetch('/api/sales/products')
      ]);
      
      const invoiceData = await invoiceRes.json();
      const customersData = await customersRes.json();
      const productsData = await productsRes.json();
      
      if (!invoiceData.success) {
        throw new Error(invoiceData.error);
      }
      
      const invoice = invoiceData.data;
      
      setFormData({
        customer_id: invoice.customer_id,
        date: invoice.date.split('T')[0],
        due_date: invoice.due_date.split('T')[0],
        notes: invoice.notes || '',
        items: invoice.items.map((item: InvoiceItem) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          product_id: item.product_id || ''
        }))
      });
      
      if (customersData.success) {
        setCustomers(customersData.data || []);
      }
      if (productsData.success) {
        setProducts(productsData.data || []);
      }
    } catch (error) {
      toast.error('Error loading invoice data');
      router.push('/sales/invoices');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleAddCustomer = async (name: string): Promise<Customer> => {
    const res = await fetch('/api/sales/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const refreshRes = await fetch('/api/sales/customers');
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setCustomers(refreshData.data || []);
        }
        toast.success(`Customer "${name}" added successfully`);
        return data.data;
      }
    }
    throw new Error('Failed to add customer');
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

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0, amount: 0, product_id: '' }]
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index][field] = value as never;
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleProductSelect = (index: number, productId: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    
    if (formData.items.some(item => !item.description || item.quantity <= 0 || item.unit_price <= 0)) {
      toast.error('Please fill in all item details');
      return;
    }
    
    setLoading(true);
    
    try {
      const totals = calculateTotals();
      const res = await fetch('/api/sales/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: params.id,
          customer_id: formData.customer_id,
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
      
      if (res.ok) {
        toast.success('Invoice updated successfully!');
        router.push(`/sales/invoices/${params.id}`);
      } else {
        toast.error(data.error || 'Failed to update invoice');
      }
    } catch (error) {
      toast.error('Error updating invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async () => {
    const reason = prompt('Please enter a reason for voiding this invoice:');
    if (!reason) return;
    
    if (confirm('Are you sure you want to void this invoice? This action cannot be undone.')) {
      try {
        const res = await fetch(`/api/sales/invoices?id=${params.id}&reason=${encodeURIComponent(reason)}`, {
          method: 'DELETE'
        });
        
        const data = await res.json();
        
        if (res.ok) {
          toast.success('Invoice voided successfully');
          router.push('/sales/invoices');
        } else {
          toast.error(data.error || 'Failed to void invoice');
        }
      } catch (error) {
        toast.error('Error voiding invoice');
      }
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  if (initialLoading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Edit Invoice</h1>
          <p>Modify existing invoice</p>
        </div>
        <div className="action-buttons">
          <button className="btn-danger" onClick={handleVoid}>
            Void Invoice
          </button>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Customer Information</h3>
            <div className="form-group">
              <label>Select Customer *</label>
              <SearchableSelect
                options={customers}
                value={formData.customer_id}
                onChange={(id) => setFormData({ ...formData, customer_id: id })}
                onAddNew={handleAddCustomer}
                placeholder="Search or add customer..."
                addNewLabel="+ Add New Customer"
                entityType="customer"
              />
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Invoice Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Invoice Date</label>
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
            <Link href={`/sales/invoices/${params.id}`}>
              <button type="button" className="btn-secondary">Cancel</button>
            </Link>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}