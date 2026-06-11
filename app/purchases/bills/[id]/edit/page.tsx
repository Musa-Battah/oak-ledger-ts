'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Supplier {
  id: string;
  name: string;
}

interface BillItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export default function EditBillPage() {
  const params = useParams();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    supplier_id: '',
    date: '',
    due_date: '',
    notes: '',
    items: [] as BillItem[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [billRes, suppliersRes] = await Promise.all([
        fetch(`/api/purchases/bills/${params.id}`),
        fetch('/api/purchases/suppliers')
      ]);
      
      const billData = await billRes.json();
      const suppliersData = await suppliersRes.json();
      
      if (!billData.success) {
        throw new Error(billData.error);
      }
      
      const bill = billData.data;
      
      setFormData({
        supplier_id: bill.supplier_id,
        date: bill.date.split('T')[0],
        due_date: bill.due_date.split('T')[0],
        notes: bill.notes || '',
        items: bill.items.map((item: BillItem) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount
        }))
      });
      
      if (suppliersData.success) {
        setSuppliers(suppliersData.data || []);
      }
    } catch (error) {
      toast.error('Error loading bill data');
      router.push('/purchases/bills');
    } finally {
      setInitialLoading(false);
    }
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
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0, amount: 0 }]
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

  const updateItem = (index: number, field: keyof BillItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index][field] = value as never;
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }
    
    if (formData.items.some(item => !item.description || item.quantity <= 0 || item.unit_price <= 0)) {
      toast.error('Please fill in all item details');
      return;
    }
    
    setLoading(true);
    
    try {
      const totals = calculateTotals();
      const res = await fetch(`/api/purchases/bills/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: params.id,
          supplier_id: formData.supplier_id,
          date: formData.date,
          due_date: formData.due_date,
          notes: formData.notes,
          items: formData.items,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Bill updated successfully!');
        router.push(`/purchases/bills/${params.id}`);
      } else {
        toast.error(data.error || 'Failed to update bill');
      }
    } catch (error) {
      toast.error('Error updating bill');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  if (initialLoading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading bill...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Edit Bill</h1>
          <p>Modify existing bill</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Supplier Information</h3>
            <div className="form-group">
              <label>Select Supplier *</label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                required
              >
                <option value="">Choose a supplier...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
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
                    <th style={{ width: '40%' }}>Description</th>
                    <th style={{ width: '15%' }}>Quantity</th>
                    <th style={{ width: '20%' }}>Unit Price (₦)</th>
                    <th style={{ width: '20%' }}>Amount (₦)</th>
                    <th style={{ width: '5%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Item description"
                          style={{ width: '100%' }}
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
                        >
                          Remove
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
            <Link href={`/purchases/bills/${params.id}`}>
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