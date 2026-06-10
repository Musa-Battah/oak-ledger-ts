'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface ReceivePaymentModalProps {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReceivePaymentModal({
  invoiceId,
  invoiceNumber,
  customerName,
  totalAmount,
  amountPaid,
  balanceDue,
  onClose,
  onSuccess
}: ReceivePaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: balanceDue,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (formData.amount > balanceDue) {
      toast.error(`Amount cannot exceed balance due of ₦${balanceDue.toLocaleString()}`);
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoiceId,
          payment_date: formData.payment_date,
          amount: formData.amount,
          payment_method: formData.payment_method,
          reference_number: formData.reference_number,
          notes: formData.notes
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Payment of ₦${formData.amount.toLocaleString()} recorded successfully`);
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Failed to record payment');
      }
    } catch (error) {
      toast.error('Error recording payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Receive Payment</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="payment-details">
            <p><strong>Invoice:</strong> {invoiceNumber}</p>
            <p><strong>Customer:</strong> {customerName}</p>
            <p><strong>Total Amount:</strong> ₦{totalAmount.toLocaleString()}</p>
            <p><strong>Amount Paid:</strong> ₦{amountPaid.toLocaleString()}</p>
            <p><strong>Balance Due:</strong> ₦{balanceDue.toLocaleString()}</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Payment Date *</label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                step="100"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                required
              />
              <small>Balance due: ₦{balanceDue.toLocaleString()}</small>
            </div>
            
            <div className="form-group">
              <label>Payment Method *</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                required
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Reference Number</label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Transaction ID, Cheque Number, etc."
              />
            </div>
            
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
            
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-container {
          background: var(--bg-card);
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        .modal-header h2 {
          margin: 0;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .modal-body {
          padding: 1.5rem;
        }
        .payment-details {
          background: var(--bg-secondary);
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        .payment-details p {
          margin: 0.25rem 0;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        small {
          color: var(--text-muted);
          font-size: 0.75rem;
          display: block;
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  );
}