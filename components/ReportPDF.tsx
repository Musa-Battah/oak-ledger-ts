import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

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
    marginBottom: 20,
    textAlign: 'center',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 5,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333333',
  },
  reportDate: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5',
    padding: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  subsectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    paddingLeft: 5,
    borderLeftWidth: 2,
    borderLeftColor: '#10b981',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  rowIndented: {
    paddingLeft: 20,
  },
  label: {
    fontSize: 9,
    color: '#333333',
  },
  amount: {
    fontSize: 9,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 5,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#999999',
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 5,
    marginTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#333333',
    fontWeight: 'bold',
    fontSize: 11,
  },
  balanceGrid: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 20,
  },
  balanceColumn: {
    flex: 1,
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

interface ReportPDFProps {
  type: 'profit-loss' | 'balance-sheet' | 'trial-balance';
  data: any;
  companyName?: string;
  period?: string;
  asAt?: string;
}

export default function ReportPDF({ type, data, companyName = 'Oak Ledger', period, asAt }: ReportPDFProps) {
  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getTitle = () => {
    switch (type) {
      case 'profit-loss':
        return 'Statement of Profit or Loss';
      case 'balance-sheet':
        return 'Statement of Financial Position';
      case 'trial-balance':
        return 'Trial Balance';
      default:
        return 'Financial Report';
    }
  };

  const getSubtitle = () => {
    if (period) return `For the period ended: ${period}`;
    if (asAt) return `As at: ${asAt}`;
    return new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renderProfitLoss = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue</Text>
        {data.revenue.items.map((item: any, index: number) => (
          <View key={index} style={styles.row}>
            <Text style={styles.label}>{item.account_name}</Text>
            <Text style={styles.amount}>{formatNaira(item.amount)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.label}>Total Revenue</Text>
          <Text style={styles.amount}>{formatNaira(data.revenue.total)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operating Expenses</Text>
        {data.expenses.items.map((item: any, index: number) => (
          <View key={index} style={styles.row}>
            <Text style={styles.label}>{item.account_name}</Text>
            <Text style={styles.amount}>{formatNaira(item.amount)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.label}>Total Expenses</Text>
          <Text style={styles.amount}>{formatNaira(data.expenses.total)}</Text>
        </View>
      </View>

      <View style={styles.grandTotalRow}>
        <Text style={styles.label}>Net Profit / (Loss)</Text>
        <Text style={styles.amount}>{formatNaira(data.netIncome)}</Text>
      </View>
    </>
  );

  const renderBalanceSheet = () => (
    <View style={styles.balanceGrid}>
      <View style={styles.balanceColumn}>
        <Text style={styles.sectionTitle}>ASSETS</Text>
        <Text style={styles.subsectionTitle}>Current Assets</Text>
        {data.assets.current.items.map((item: any, index: number) => (
          <View key={index} style={styles.row}>
            <Text style={styles.label}>{item.account_name}</Text>
            <Text style={styles.amount}>{formatNaira(item.balance)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.label}>Total Current Assets</Text>
          <Text style={styles.amount}>{formatNaira(data.assets.current.total)}</Text>
        </View>

        <Text style={styles.subsectionTitle}>Non-Current Assets</Text>
        {data.assets.fixed.items.map((item: any, index: number) => (
          <View key={index} style={styles.row}>
            <Text style={styles.label}>{item.account_name}</Text>
            <Text style={styles.amount}>{formatNaira(item.balance)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.label}>Total Non-Current Assets</Text>
          <Text style={styles.amount}>{formatNaira(data.assets.fixed.total)}</Text>
        </View>

        <View style={styles.grandTotalRow}>
          <Text style={styles.label}>TOTAL ASSETS</Text>
          <Text style={styles.amount}>{formatNaira(data.assets.total)}</Text>
        </View>
      </View>

      <View style={styles.balanceColumn}>
        <Text style={styles.sectionTitle}>EQUITY & LIABILITIES</Text>
        
        <Text style={styles.subsectionTitle}>Equity</Text>
        {data.equity.items.map((item: any, index: number) => (
          <View key={index} style={styles.row}>
            <Text style={styles.label}>{item.account_name}</Text>
            <Text style={styles.amount}>{formatNaira(item.balance)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.label}>Total Equity</Text>
          <Text style={styles.amount}>{formatNaira(data.equity.total)}</Text>
        </View>

        <Text style={styles.subsectionTitle}>Current Liabilities</Text>
        {data.liabilities.current.items.map((item: any, index: number) => (
          <View key={index} style={styles.row}>
            <Text style={styles.label}>{item.account_name}</Text>
            <Text style={styles.amount}>{formatNaira(item.balance)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.label}>Total Current Liabilities</Text>
          <Text style={styles.amount}>{formatNaira(data.liabilities.current.total)}</Text>
        </View>

        <Text style={styles.subsectionTitle}>Non-Current Liabilities</Text>
        {data.liabilities.longTerm.items.map((item: any, index: number) => (
          <View key={index} style={styles.row}>
            <Text style={styles.label}>{item.account_name}</Text>
            <Text style={styles.amount}>{formatNaira(item.balance)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.label}>Total Non-Current Liabilities</Text>
          <Text style={styles.amount}>{formatNaira(data.liabilities.longTerm.total)}</Text>
        </View>

        <View style={styles.grandTotalRow}>
          <Text style={styles.label}>TOTAL EQUITY & LIABILITIES</Text>
          <Text style={styles.amount}>{formatNaira(data.liabilities.total + data.equity.total)}</Text>
        </View>
      </View>
    </View>
  );

  const renderTrialBalance = () => (
    <>
      <View style={styles.tableHeader}>
        <Text style={{ flex: 3 }}>Account</Text>
        <Text style={{ flex: 1, textAlign: 'right' }}>Debit (₦)</Text>
        <Text style={{ flex: 1, textAlign: 'right' }}>Credit (₦)</Text>
      </View>
      {data.accounts.map((account: any, index: number) => (
        <View key={index} style={styles.row}>
          <Text style={{ flex: 3 }}>{account.account_code} - {account.account_name}</Text>
          <Text style={{ flex: 1, textAlign: 'right' }}>
            {account.debit > 0 ? formatNaira(account.debit) : '-'}
          </Text>
          <Text style={{ flex: 1, textAlign: 'right' }}>
            {account.credit > 0 ? formatNaira(account.credit) : '-'}
          </Text>
        </View>
      ))}
      <View style={styles.grandTotalRow}>
        <Text style={{ flex: 3 }}>Totals</Text>
        <Text style={{ flex: 1, textAlign: 'right' }}>{formatNaira(data.totalDebits)}</Text>
        <Text style={{ flex: 1, textAlign: 'right' }}>{formatNaira(data.totalCredits)}</Text>
      </View>
    </>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.reportTitle}>{getTitle()}</Text>
          <Text style={styles.reportDate}>{getSubtitle()}</Text>
        </View>

        {type === 'profit-loss' && renderProfitLoss()}
        {type === 'balance-sheet' && renderBalanceSheet()}
        {type === 'trial-balance' && renderTrialBalance()}

        <View style={styles.footer}>
          <Text>Generated by Oak Ledger Accounting System</Text>
          <Text>This is a computer-generated document. No signature required.</Text>
        </View>
      </Page>
    </Document>
  );
}