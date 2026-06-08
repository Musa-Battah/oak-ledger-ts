'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  bill_count: number;
  outstanding: number;
}

export default function SuppliersPage(): React.ReactElement {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async (): Promise<void> => {
    try {
      const res = await fetch('/api/purchases/suppliers');
      const data = await res.json();
      
      if (data.success) {
        setSuppliers(data.data || []);
      }
    } catch (error) {
      toast.error('Error fetching suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/purchases/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Supplier created successfully');
        setShowForm(false);
        setFormData({ name: '', email: '', phone: '', address: '' });
        fetchSuppliers();
      } else {
        toast.error(data.error || 'Failed to create supplier');
      }
    } catch (error) {
      toast.error('Error creating supplier');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Suppliers</h1>
          <p>Manage your vendor relationships</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Supplier'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="card-title">Create New Supplier</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Supplier Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Company name"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="supplier@example.com"
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Contact number"
              />
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                placeholder="Supplier address..."
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Save Supplier</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {suppliers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏭</div>
            <div className="empty-title" style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No suppliers yet
            </div>
            <div className="empty-description" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Add your first supplier to track purchases
            </div>
            <button 
              className="btn-primary" 
              onClick={() => setShowForm(true)}
            >
              Create Supplier
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Bills</th>
                  <th>Outstanding</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td><strong>{supplier.name}</strong></td>
                    <td>{supplier.email || '-'}</td>
                    <td>{supplier.phone || '-'}</td>
                    <td>{supplier.bill_count || 0}</td>
                    <td className={supplier.outstanding > 0 ? 'text-danger' : 'text-success'}>
                      ₦{(supplier.outstanding || 0).toLocaleString()}
                    </td>
                    <td>
                      <Link href={`/purchases/suppliers/${supplier.id}`}>
                        <button className="btn-secondary">View</button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}