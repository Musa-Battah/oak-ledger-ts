import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts for better appearance
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2', fontWeight: 'normal' },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa25L7W0Q5nw.woff2', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Inter',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#10b981',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 5,
  },
  companyDetails: {
    fontSize: 9,
    color: '#666666',
    marginTop: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333333',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  infoSection: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  colDescription: { flex: 3 },
  colQuantity: { flex: 1, textAlign: 'right' },
  colUnitPrice: { flex: 1.5, textAlign: 'right' },
  colAmount: { flex: 1.5, textAlign: 'right' },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 5,
  },
  totalsLabel: {
    width: 100,
    textAlign: 'right',
    paddingRight: 10,
    fontWeight: 'bold',
    color: '#333333',
  },
  totalsValue: {
    width: 100,
    textAlign: 'right',
  },
  grandTotal: {
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 2,
    borderTopColor: '#333333',
    fontWeight: 'bold',
    fontSize: 12,
  },
  notes: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#dddddd',
    fontSize: 8,
    color: '#666666',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    paddingTop: 10,
  },
});

interface InvoicePDFProps {
  invoice: {
    invoice_number: string;
    customer_name: string;
    date: string;
    due_date: string;
    subtotal: number;
    tax: number;
    total: number;
    notes?: string;
    items: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      amount: number;
    }>;
  };
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
}

export default function InvoicePDF({ 
  invoice, 
  companyName = 'Oak Ledger',
  companyAddress = 'Lagos, Nigeria',
  companyEmail = 'hello@oakledger.com',
  companyPhone = '+234 800 000 0000'
}: InvoicePDFProps) {
  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.companyDetails}>{companyAddress}</Text>
          <Text style={styles.companyDetails}>Email: {companyEmail} | Phone: {companyPhone}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>TAX INVOICE</Text>

        {/* Invoice Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>BILL TO</Text>
            <Text style={styles.infoValue}>{invoice.customer_name}</Text>
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>INVOICE NUMBER</Text>
            <Text style={styles.infoValue}>{invoice.invoice_number}</Text>
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>INVOICE DATE</Text>
            <Text style={styles.infoValue}>{new Date(invoice.date).toLocaleDateString('en-NG')}</Text>
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>DUE DATE</Text>
            <Text style={styles.infoValue}>{new Date(invoice.due_date).toLocaleDateString('en-NG')}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQuantity}>Qty</Text>
            <Text style={styles.colUnitPrice}>Unit Price</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          
          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQuantity}>{item.quantity}</Text>
              <Text style={styles.colUnitPrice}>{formatNaira(item.unit_price)}</Text>
              <Text style={styles.colAmount}>{formatNaira(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal:</Text>
            <Text style={styles.totalsValue}>{formatNaira(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>VAT (7.5%):</Text>
            <Text style={styles.totalsValue}>{formatNaira(invoice.tax)}</Text>
          </View>
          <View style={[styles.totalsRow, styles.grandTotal]}>
            <Text style={styles.totalsLabel}>TOTAL:</Text>
            <Text style={styles.totalsValue}>{formatNaira(invoice.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text>Notes: {invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your business!</Text>
          <Text>This is a computer-generated document. No signature required.</Text>
        </View>
      </Page>
    </Document>
  );
}