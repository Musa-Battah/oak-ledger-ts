'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import MakePaymentModal from '@/components/MakePaymentModal';
import { formatNaira } from '@/lib/format-client';

interface BillItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface Bill {
  id: string;
  bill_number: string;
  supplier_name: string;
  date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  notes: string;
  items: BillItem[];
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

export default function BillDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const id = params?.id as string;
    if (id) {
      fetchBill(id);
      fetchPayments(id);
    }
  }, [params?.id]);

  const fetchBill = async (id: string) => {
    try {
      const res = await fetch(`/api/purchases/bills/${id}`);
      const data = await res.json();
      if (data.success) {
        setBill(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch bill');
      }
    } catch (error) {
      toast.error('Error fetching bill');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (id: string) => {
    try {
      const res = await fetch(`/api/payments?billId=${id}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handlePaymentSuccess = () => {
    const id = params?.id as string;
    if (id) {
      fetchBill(id);
      fetchPayments(id);
    }
  };

  const handleVoid = async () => {
  const reason = prompt('Please enter a reason for voiding this bill:');
  if (!reason) return;
  
  if (confirm('Are you sure you want to void this bill? This action cannot be undone.')) {
    try {
      const res = await fetch(`/api/purchases/bills/${params.id}?reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Bill voided successfully');
        router.push('/purchases/bills');
      } else {
        toast.error(data.error || 'Failed to void bill');
      }
    } catch (error) {
      toast.error('Error voiding bill');
    }
  }
};



  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading bill...</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Bill not found</p>
          <Link href="/purchases/bills">
            <button className="btn-primary">Back to Bills</button>
          </Link>
        </div>
      </div>
    );
  }

  const isFullyPaid = (bill.balance_due || 0) <= 0;

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Bill {bill.bill_number}</h1>
          <p>{bill.supplier_name}</p>
        </div>
        
        <div className="action-buttons">
            <Link href="/purchases/bills">
              <button className="btn-secondary">Back</button>
            </Link>
            {!isFullyPaid && bill.status !== 'cancelled' && bill.status !== 'void' && (
              <>
                <Link href={`/purchases/bills/${bill.id}/edit`}>
                  <button className="btn-secondary">Edit</button>
                </Link>
                <button className="btn-primary" onClick={() => setShowPaymentModal(true)}>
                  Make Payment
                </button>
              </>
            )}
            {bill.status !== 'void' && bill.status !== 'paid' && (
              <button className="btn-danger" onClick={handleVoid}>
                Void Bill
              </button>
            )}
          </div>

      </div>

      <div className="bill-status">
        <div className={`status-badge ${bill.status}`}>
          Status: {bill.status.toUpperCase()}
        </div>
        {isFullyPaid && (
          <div className="paid-badge">✓ Fully Paid</div>
        )}
      </div>

      <div className="bill-grid">
        {/* Bill Details */}
        <div className="card">
          <h2>Bill Details</h2>
          <div className="details-grid">
            <div className="detail-item">
              <label>Bill Date</label>
              <p>{new Date(bill.date).toLocaleDateString()}</p>
            </div>
            <div className="detail-item">
              <label>Due Date</label>
              <p>{new Date(bill.due_date).toLocaleDateString()}</p>
            </div>
            <div className="detail-item">
              <label>Subtotal</label>
              <p>{formatNaira(bill.subtotal)}</p>
            </div>
            <div className="detail-item">
              <label>VAT (7.5%)</label>
              <p>{formatNaira(bill.tax)}</p>
            </div>
            <div className="detail-item">
              <label>Total</label>
              <p className="total">{formatNaira(bill.total)}</p>
            </div>
            <div className="detail-item">
              <label>Amount Paid</label>
              <p className="paid">{formatNaira(bill.amount_paid || 0)}</p>
            </div>
            <div className="detail-item">
              <label>Balance Due</label>
              <p className={`balance ${(bill.balance_due || 0) > 0 ? 'due' : 'paid'}`}>
                {formatNaira(bill.balance_due || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="card">
          <h2>Items</h2>
          <div className="table-container">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.items && bill.items.map((item, index) => (
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
          {bill.notes && (
            <div className="notes">
              <label>Notes:</label>
              <p>{bill.notes}</p>
            </div>
          )}
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="card">
            <h2>Payment History</h2>
            <div className="table-container">
              <table className="payments-table">
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
                    <td colSpan={3}><strong>{formatNaira(payments.reduce((sum, p) => sum + p.amount, 0))}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {showPaymentModal && bill && (
        <MakePaymentModal
          billId={bill.id}
          billNumber={bill.bill_number}
          supplierName={bill.supplier_name}
          totalAmount={bill.total}
          amountPaid={bill.amount_paid || 0}
          balanceDue={bill.balance_due || bill.total}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}