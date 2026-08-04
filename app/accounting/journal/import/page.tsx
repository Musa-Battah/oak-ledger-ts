'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ImportPreview {
  row: number;
  date: string;
  description: string;
  reference: string;
  account_name: string;
  debit: number;
  credit: number;
  isValid: boolean;
  errors: string[];
}

export default function ImportJournalPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportPreview[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; message: string } | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setPreview([]);
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

    try {
      const res = await fetch('/api/journal/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setPreview(data.entries || []);
        setStep('preview');
        toast.success(`File validated: ${data.entries?.length || 0} entries found`);
      } else {
        setError(data.error || 'Validation failed');
        setPreview(data.entries || []);
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

    try {
      const res = await fetch('/api/journal/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setImportResult({
          imported: data.imported || 0,
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
    setPreview([]);
    setImportResult(null);
    setStep('upload');
    setError(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Import Journal Entries</h1>
          <p>Import journal entries from CSV or Excel files</p>
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
                <li><strong>Required columns:</strong> Date, Description, Account Name, Debit or Credit</li>
                <li><strong>Optional columns:</strong> Reference</li>
                <li><strong>Date format:</strong> YYYY-MM-DD</li>
                <li><strong>Account Name:</strong> Must match existing account or will be created</li>
                <li><strong>Balance:</strong> Total debits must equal total credits for each journal entry</li>
              </ul>
              <div className="template-download">
                <a href="/templates/journal_template.csv" download>
                  <button className="btn-secondary">📄 Download Template</button>
                </a>
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
        {step === 'preview' && (
          <div>
            <div className="preview-header">
              <h3>Preview Journal Entries</h3>
              <p>Review the entries below. Only valid entries will be imported.</p>
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
                    <th>Row</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Reference</th>
                    <th>Account</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((entry) => (
                    <tr key={entry.row} className={entry.isValid ? 'valid' : 'invalid'}>
                      <td>{entry.row}</td>
                      <td>{entry.date}</td>
                      <td>{entry.description}</td>
                      <td>{entry.reference || '-'}</td>
                      <td>{entry.account_name}</td>
                      <td>{entry.debit > 0 ? `₦${entry.debit.toLocaleString()}` : '-'}</td>
                      <td>{entry.credit > 0 ? `₦${entry.credit.toLocaleString()}` : '-'}</td>
                      <td>
                        {entry.isValid ? (
                          <span className="badge badge-success">Valid</span>
                        ) : (
                          <span className="badge badge-danger">Invalid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="preview-summary">
              <span>Total Entries: {preview.length}</span>
              <span className="valid-count">Valid: {preview.filter(e => e.isValid).length}</span>
              <span className="invalid-count">Invalid: {preview.filter(e => !e.isValid).length}</span>
            </div>

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
                disabled={loading || preview.every(e => !e.isValid)}
              >
                {loading ? 'Importing...' : `Import ${preview.filter(e => e.isValid).length} Entries`}
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
        .preview-summary {
          display: flex;
          gap: 2rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 8px;
          margin: 1rem 0;
        }
        .valid-count {
          color: var(--success);
        }
        .invalid-count {
          color: var(--danger);
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
        .stat-item {
          text-align: center;
        }
        .stat-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
        }
        .stat-value.success {
          color: var(--success);
        }
        .stat-value.warning {
          color: var(--warning);
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
          .preview-table {
            font-size: 0.75rem;
          }
          .preview-table th,
          .preview-table td {
            padding: 0.5rem;
          }
          .result-stats {
            gap: 2rem;
          }
        }
      `}</style>
    </div>
  );
}