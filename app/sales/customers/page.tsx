'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  invoice_count: number;
  outstanding: number;
}

export default function CustomersPage(): React.ReactElement {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (): Promise<void> => {
    try {
      const res = await fetch('/api/sales/customers');
      const data = await res.json();
      
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (error) {
      toast.error('Error fetching customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/sales/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Customer created successfully');
        setShowForm(false);
        setFormData({ name: '', email: '', phone: '', address: '' });
        fetchCustomers();
      } else {
        toast.error(data.error || 'Failed to create customer');
      }
    } catch (error) {
      toast.error('Error creating customer');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Customers</h1>
          <p>Manage your customer relationships</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Customer'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="card-title">Create New Customer</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Customer Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="John Doe, ABC Company, etc."
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0803 123 4567"
              />
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                placeholder="Customer address..."
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Save Customer</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
            <div className="empty-title" style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No customers yet
            </div>
            <div className="empty-description" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Create your first customer to start selling
            </div>
            <button 
              className="btn-primary" 
              onClick={() => setShowForm(true)}
            >
              Create Customer
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
                  <th>Invoices</th>
                  <th>Outstanding</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td><strong>{customer.name}</strong></td>
                    <td>{customer.email || '-'}</td>
                    <td>{customer.phone || '-'}</td>
                    <td>{customer.invoice_count || 0}</td>
                    <td className={customer.outstanding > 0 ? 'text-danger' : 'text-success'}>
                      ₦{(customer.outstanding || 0).toLocaleString()}
                    </td>
                    <td>
                      <Link href={`/sales/customers/${customer.id}`}>
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