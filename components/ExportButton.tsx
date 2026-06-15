'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface ExportButtonProps {
  exportUrl: string;
  filename: string;
  buttonText?: string;
  variant?: 'primary' | 'secondary';
}

export default function ExportButton({
  exportUrl,
  filename,
  buttonText = 'Export to Excel',
  variant = 'secondary'
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await fetch(exportUrl);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Export completed successfully');
    } catch (error) {
      toast.error('Failed to export data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={variant === 'primary' ? 'btn-primary' : 'btn-secondary'}
      onClick={handleExport}
      disabled={loading}
    >
      {loading ? 'Exporting...' : `📊 ${buttonText}`}
    </button>
  );
}