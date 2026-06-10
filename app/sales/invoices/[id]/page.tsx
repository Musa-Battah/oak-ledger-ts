'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ReceivePaymentModal from '@/components/ReceivePaymentModal';
import { formatNaira } from '@/lib/format-client';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  notes: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
}

interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  status: string;
}

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchInvoice();
    fetchPayments();
  }, []);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/sales/invoices/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setInvoice(data.data);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Error fetching invoice');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/payments?invoiceId=${params.id}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handlePaymentSuccess = () => {
    fetchInvoice();
    fetchPayments();
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Invoice not found</p>
          <Link href="/sales/invoices">
            <button className="btn-primary">Back to Invoices</button>
          </Link>
        </div>
      </div>
    );
  }

  const isFullyPaid = invoice.balance_due <= 0;

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Invoice {invoice.invoice_number}</h1>
          <p>{invoice.customer_name}</p>
        </div>
        <div className="action-buttons">
          <Link href="/sales/invoices">
            <button className="btn-secondary">Back</button>
          </Link>
          {!isFullyPaid && invoice.status !== 'cancelled' && (
            <button className="btn-primary" onClick={() => setShowPaymentModal(true)}>
              Receive Payment
            </button>
          )}
        </div>
      </div>

      <div className="invoice-status">
        <div className={`status-badge ${invoice.status}`}>
          Status: {invoice.status.toUpperCase()}
        </div>
        {isFullyPaid && (
          <div className="paid-badge">✓ Fully Paid</div>
        )}
      </div>

      <div className="invoice-grid">
        {/* Invoice Details */}
        <div className="card">
          <h2>Invoice Details</h2>
          <div className="details-grid">
            <div className="detail-item">
              <label>Invoice Date</label>
              <p>{new Date(invoice.date).toLocaleDateString()}</p>
            </div>
            <div className="detail-item">
              <label>Due Date</label>
              <p>{new Date(invoice.due_date).toLocaleDateString()}</p>
            </div>
            <div className="detail-item">
              <label>Subtotal</label>
              <p>{formatNaira(invoice.subtotal)}</p>
            </div>
            <div className="detail-item">
              <label>VAT (7.5%)</label>
              <p>{formatNaira(invoice.tax)}</p>
            </div>
            <div className="detail-item">
              <label>Total</label>
              <p className="total">{formatNaira(invoice.total)}</p>
            </div>
            <div className="detail-item">
              <label>Amount Paid</label>
              <p className="paid">{formatNaira(invoice.amount_paid || 0)}</p>
            </div>
            <div className="detail-item">
              <label>Balance Due</label>
              <p className={`balance ${invoice.balance_due > 0 ? 'due' : 'paid'}`}>
                {formatNaira(invoice.balance_due || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="card">
          <h2>Items</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{formatNaira(item.unit_price)}</td>
                    <td>{formatNaira(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invoice.notes && (
            <div className="notes">
              <label>Notes:</label>
              <p>{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="card">
            <h2>Payment History</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Payment #</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.payment_number}</td>
                      <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td>{formatNaira(payment.amount)}</td>
                      <td>{payment.payment_method.replace('_', ' ')}</td>
                      <td>{payment.reference_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan={2}><strong>Total Paid</strong></td>
                    <td><strong>{formatNaira(payments.reduce((sum, p) => sum + p.amount, 0))}</strong></td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {showPaymentModal && invoice && (
        <ReceivePaymentModal
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number}
          customerName={invoice.customer_name}
          totalAmount={invoice.total}
          amountPaid={invoice.amount_paid || 0}
          balanceDue={invoice.balance_due || invoice.total}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <style jsx>{`
        .invoice-status {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .status-badge {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
        }
        .status-badge.sent {
          background: var(--warning-dim);
          color: var(--warning);
        }
        .status-badge.paid {
          background: var(--success-dim);
          color: var(--success);
        }
        .paid-badge {
          padding: 0.5rem 1rem;
          background: var(--success-dim);
          color: var(--success);
          border-radius: 6px;
          font-weight: 600;
        }
        .invoice-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .detail-item label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .detail-item p {
          font-size: 1rem;
          font-weight: 500;
          margin-top: 0.25rem;
        }
        .detail-item .total {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .detail-item .paid {
          color: var(--success);
        }
        .detail-item .balance.due {
          color: var(--danger);
        }
        .notes {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
        .notes label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .total-row {
          background: var(--bg-tertiary);
        }
        @media (max-width: 768px) {
          .details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}