'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface CSVImporterProps {
  type: 'customers' | 'products';
  onSuccess?: () => void;
}

export default function CSVImporter({ type, onSuccess }: CSVImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          imported: data.imported || 0,
          skipped: data.skipped || 0,
          errors: data.errors || [],
        });
        toast.success(data.message || 'Import completed');
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="csv-importer">
      <div className="csv-importer-dropzone">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="csv-importer-input"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="csv-importer-label">
          <span className="csv-importer-icon">📄</span>
          <span>Click to choose file or drag and drop</span>
          <span className="csv-importer-hint">Supports .csv, .xlsx, .xls</span>
        </label>
      </div>

      {file && (
        <div className="csv-importer-file">
          <span>{file.name}</span>
          <span className="csv-importer-size">{(file.size / 1024).toFixed(1)} KB</span>
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleUpload}
        disabled={!file || loading}
      >
        {loading ? 'Importing...' : `Import ${type}`}
      </button>

      {result && (
        <div className="csv-importer-result">
          <div className="csv-importer-stats">
            <span className="success">✅ Imported: {result.imported}</span>
            <span className="warning">⚠️ Skipped: {result.skipped}</span>
          </div>
          {result.errors.length > 0 && (
            <details className="csv-importer-errors">
              <summary>View Errors ({result.errors.length})</summary>
              <ul>
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <style jsx>{`
        .csv-importer {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .csv-importer-dropzone {
          border: 2px dashed var(--border);
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.3s ease;
        }
        .csv-importer-dropzone:hover {
          border-color: var(--success);
        }
        .csv-importer-input {
          display: none;
        }
        .csv-importer-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .csv-importer-icon {
          font-size: 2rem;
        }
        .csv-importer-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .csv-importer-file {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          border-radius: 8px;
          font-size: 0.875rem;
        }
        .csv-importer-size {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .csv-importer-result {
          margin-top: 1rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 8px;
        }
        .csv-importer-stats {
          display: flex;
          gap: 1.5rem;
        }
        .csv-importer-stats .success {
          color: var(--success);
        }
        .csv-importer-stats .warning {
          color: var(--warning);
        }
        .csv-importer-errors {
          margin-top: 0.5rem;
        }
        .csv-importer-errors summary {
          cursor: pointer;
          color: var(--danger);
          font-size: 0.875rem;
        }
        .csv-importer-errors ul {
          margin: 0.5rem 0 0 1.5rem;
          color: var(--text-secondary);
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}