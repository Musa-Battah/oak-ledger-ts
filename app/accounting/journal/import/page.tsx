'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ValidationGroup {
  groupKey: string;
  description: string;
  reference: string;
  date: string;
  totalDebit: number;
  totalCredit: number;
  isValid: boolean;
  errors: string[];
  entries: Array<{
    row: number;
    account_name: string;
    account_type: string;
    debit: number;
    credit: number;
  }>;
}

interface ValidationSummary {
  totalGroups: number;
  validGroups: number;
  invalidGroups: number;
  allValid: boolean;
}

export default function ImportJournalPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [validationResult, setValidationResult] = useState<{
    groups: ValidationGroup[];
    summary: ValidationSummary;
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    totalGroups: number;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setValidationResult(null);
      setImportResult(null);
      setStep('upload');
    }
  };

  const handlePreview = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('preview', 'true');

    try {
      const res = await fetch('/api/journal/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.preview) {
          setValidationResult({
            groups: data.groups || [],
            summary: data.summary || { totalGroups: 0, validGroups: 0, invalidGroups: 0, allValid: false }
          });
          setStep('preview');
          
          if (data.summary.allValid) {
            toast.success(`✅ All ${data.summary.totalGroups} journal entries are valid!`);
          } else {
            toast.error(`⚠️ ${data.summary.invalidGroups} journal entries have issues`);
          }
        } else {
          toast.error('Unexpected response from server');
        }
      } else {
        setError(data.error || 'Validation failed');
        toast.error(data.error || 'Validation failed');
      }
    } catch (error) {
      toast.error('Error validating file');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('preview', 'false');

    try {
      const res = await fetch('/api/journal/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setImportResult({
          imported: data.imported || 0,
          totalGroups: data.totalGroups || 0,
          message: data.message || 'Import completed'
        });
        setStep('result');
        toast.success(data.message || 'Import completed successfully');
      } else {
        setError(data.error || 'Import failed');
        toast.error(data.error || 'Import failed');
      }
    } catch (error) {
      toast.error('Error importing');
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setValidationResult(null);
    setImportResult(null);
    setStep('upload');
    setError(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Import Journal Entries</h1>
          <p>Pre-validate and import journal entries from CSV or Excel files</p>
        </div>
        <div className="action-buttons">
          <Link href="/accounting/journal">
            <button className="btn-secondary">Back to Journal</button>
          </Link>
        </div>
      </div>

      <div className="card">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div>
            <div className="import-info">
              <h3>File Format Requirements</h3>
              <ul>
                <li><strong>Required columns:</strong> Date, Description, Account Name, Debit, Credit</li>
                <li><strong>Optional columns:</strong> Reference, Account Type</li>
                <li><strong>Date format:</strong> YYYY-MM-DD</li>
                <li><strong>Grouping:</strong> Rows with the same Description are grouped into one journal entry</li>
                <li><strong>Balance:</strong> Each group must have equal Debits and Credits</li>
              </ul>
              <div className="template-download">
                <Link href="/api/templates/journal" download>
                  <button className="btn-secondary">📄 Download Template</button>
                </Link>
              </div>
            </div>

            <div className="import-dropzone">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="import-input"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="import-label">
                <span className="import-icon">📄</span>
                <span>Click to choose file or drag and drop</span>
                <span className="import-hint">Supports .csv, .xlsx, .xls</span>
              </label>
            </div>

            {file && (
              <div className="import-file">
                <span>{file.name}</span>
                <span className="import-size">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            )}

            {error && (
              <div className="import-error">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="import-actions">
              <button
                className="btn-primary"
                onClick={handlePreview}
                disabled={!file || loading}
              >
                {loading ? 'Validating...' : 'Preview & Validate'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && validationResult && (
          <div>
            <div className="preview-header">
              <h3>Preview Journal Entries</h3>
              <p>Review the validated entries below.</p>
              
              <div className="preview-summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Entries</span>
                  <span className="stat-value">{validationResult.summary.totalGroups}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Valid</span>
                  <span className="stat-value success">{validationResult.summary.validGroups}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Invalid</span>
                  <span className="stat-value danger">{validationResult.summary.invalidGroups}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Status</span>
                  <span className={`stat-value ${validationResult.summary.allValid ? 'success' : 'danger'}`}>
                    {validationResult.summary.allValid ? '✅ All Valid' : '❌ Has Errors'}
                  </span>
                </div>
              </div>

              {error && (
                <div className="import-error">
                  <strong>Validation Errors Found:</strong> {error}
                </div>
              )}
            </div>

            <div className="table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Reference</th>
                    <th>Debit Total</th>
                    <th>Credit Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResult.groups.map((group, index) => (
                    <tr key={group.groupKey} className={group.isValid ? 'valid' : 'invalid'}>
                      <td>{index + 1}</td>
                      <td>{new Date(group.date).toLocaleDateString()}</td>
                      <td>{group.description}</td>
                      <td>{group.reference || '-'}</td>
                      <td>{formatNaira(group.totalDebit)}</td>
                      <td>{formatNaira(group.totalCredit)}</td>
                      <td>
                        {group.isValid ? (
                          <span className="badge badge-success">✅ Balanced</span>
                        ) : (
                          <span className="badge badge-danger">❌ Unbalanced</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!validationResult.summary.allValid && (
              <div className="preview-errors">
                <h4>Errors Found:</h4>
                <ul>
                  {validationResult.groups
                    .filter(g => !g.isValid)
                    .map((group) => (
                      <li key={group.groupKey}>
                        <strong>{group.description}</strong>: 
                        Debits {formatNaira(group.totalDebit)}, 
                        Credits {formatNaira(group.totalCredit)}, 
                        Difference {formatNaira(group.totalDebit - group.totalCredit)}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="import-actions">
              <button
                className="btn-secondary"
                onClick={resetImport}
              >
                Back
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirmImport}
                disabled={loading || !validationResult.summary.allValid}
              >
                {loading ? 'Importing...' : `Import ${validationResult.summary.totalGroups} Entries`}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && importResult && (
          <div>
            <div className="result-header">
              <div className="result-icon">✅</div>
              <h3>Import Complete</h3>
              <p>{importResult.message}</p>
            </div>

            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-label">Imported</span>
                <span className="stat-value success">{importResult.imported}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Groups</span>
                <span className="stat-value">{importResult.totalGroups}</span>
              </div>
            </div>

            <div className="import-actions">
              <button
                className="btn-primary"
                onClick={() => router.push('/accounting/journal')}
              >
                View Journal Entries
              </button>
              <button
                className="btn-secondary"
                onClick={resetImport}
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .import-info {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: var(--bg-tertiary);
          border-radius: 8px;
        }
        .import-info ul {
          margin: 1rem 0 0 1.5rem;
          line-height: 1.8;
          color: var(--text-secondary);
        }
        .template-download {
          margin-top: 1rem;
        }
        .import-dropzone {
          border: 2px dashed var(--border);
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.3s ease;
          margin-bottom: 1rem;
        }
        .import-dropzone:hover {
          border-color: var(--success);
        }
        .import-input {
          display: none;
        }
        .import-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .import-icon {
          font-size: 2rem;
        }
        .import-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .import-file {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .import-size {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .import-error {
          margin: 1rem 0;
          padding: 1rem;
          background: var(--danger-dim);
          color: var(--danger);
          border-radius: 8px;
        }
        .import-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }
        .preview-header {
          margin-bottom: 1.5rem;
        }
        .preview-summary-stats {
          display: flex;
          gap: 2rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 8px;
          margin: 1rem 0;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .stat-value {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .stat-value.success {
          color: var(--success);
        }
        .stat-value.danger {
          color: var(--danger);
        }
        .preview-table {
          width: 100%;
          border-collapse: collapse;
        }
        .preview-table th,
        .preview-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .preview-table th {
          background: var(--bg-tertiary);
          font-weight: 600;
          color: var(--text-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .preview-table tr.valid {
          border-left: 3px solid var(--success);
        }
        .preview-table tr.invalid {
          border-left: 3px solid var(--danger);
        }
        .preview-errors {
          margin: 1rem 0;
          padding: 1rem;
          background: var(--danger-dim);
          border-radius: 8px;
          color: var(--danger);
        }
        .preview-errors ul {
          margin: 0.5rem 0 0 1.5rem;
        }
        .result-header {
          text-align: center;
          padding: 2rem;
        }
        .result-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .result-header h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .result-stats {
          display: flex;
          justify-content: center;
          gap: 4rem;
          padding: 2rem;
        }
        .badge-success {
          background: var(--success-dim);
          color: var(--success);
        }
        .badge-danger {
          background: var(--danger-dim);
          color: var(--danger);
        }
        @media (max-width: 768px) {
          .preview-summary-stats {
            flex-wrap: wrap;
            gap: 1rem;
          }
          .result-stats {
            gap: 2rem;
          }
          .preview-table {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}