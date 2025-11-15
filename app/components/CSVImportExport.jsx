'use client';

import { useState } from 'react';

/**
 * Reusable CSV Import/Export component
 * @param {Object} props
 * @param {Array} props.data - Array of objects to export
 * @param {Array} props.columns - Array of column definitions {key: string, label: string}
 * @param {Function} props.onImport - Callback function for import (receives parsed data array)
 * @param {string} props.filename - Base filename for export (without .csv)
 * @param {string} props.entityName - Name of entity for user messages (e.g., "customers", "products")
 * @param {Array} props.sampleData - Optional sample data for template download
 */
export default function CSVImportExport({
  data = [],
  columns = [],
  onImport,
  filename = 'export',
  entityName = 'items',
  sampleData = null
}) {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);

  // Export to CSV
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert(`No ${entityName} to export`);
      return;
    }

    try {
      // Create CSV header
      const headers = columns.map(col => col.label).join(',');

      // Create CSV rows
      const rows = data.map(item => {
        return columns.map(col => {
          let value = item[col.key];

          // Handle null/undefined
          if (value === null || value === undefined) {
            value = '';
          }

          // Handle dates
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0];
          }

          // Handle arrays
          if (Array.isArray(value)) {
            value = value.join('; ');
          }

          // Convert to string and escape quotes
          value = String(value).replace(/"/g, '""');

          // Wrap in quotes if contains comma, newline, or quote
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            value = `"${value}"`;
          }

          return value;
        }).join(',');
      });

      // Combine header and rows
      const csv = [headers, ...rows].join('\n');

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export ${entityName}. Please try again.`);
    }
  };

  // Import from CSV
  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset messages
    setImportError(null);
    setImportSuccess(null);

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setImportError('Please select a CSV file');
      event.target.value = ''; // Reset input
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('CSV file is empty or contains only headers');
      }

      // Parse header
      const headerLine = lines[0];
      const headers = parseCSVLine(headerLine);

      // Map headers to column keys
      const headerMap = {};
      columns.forEach(col => {
        const headerIndex = headers.findIndex(h =>
          h.toLowerCase() === col.label.toLowerCase()
        );
        if (headerIndex !== -1) {
          headerMap[col.key] = headerIndex;
        }
      });

      // Parse data rows
      const parsedData = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        const rowData = {};

        columns.forEach(col => {
          const index = headerMap[col.key];
          if (index !== undefined && values[index] !== undefined) {
            rowData[col.key] = values[index].trim();
          }
        });

        parsedData.push(rowData);
      }

      if (parsedData.length === 0) {
        throw new Error('No valid data rows found in CSV');
      }

      // Call the import callback
      if (onImport) {
        await onImport(parsedData);
        setImportSuccess(`Successfully imported ${parsedData.length} ${entityName}`);
        setTimeout(() => setImportSuccess(null), 5000);
      }

    } catch (error) {
      console.error('Import error:', error);
      setImportError(error.message || `Failed to import ${entityName}`);
    } finally {
      setIsImporting(false);
      event.target.value = ''; // Reset input
    }
  };

  // Parse CSV line handling quotes and commas
  const parseCSVLine = (line) => {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          currentValue += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // End of value
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    // Add last value
    values.push(currentValue);

    return values;
  };

  // Download sample CSV template
  const handleDownloadSample = () => {
    try {
      // Use provided sample data or create a template with headers only
      const dataToExport = sampleData || [{}];

      // Create CSV header
      const headers = columns.map(col => col.label).join(',');

      // Create CSV rows (if sample data provided)
      const rows = sampleData ? dataToExport.map(item => {
        return columns.map(col => {
          let value = item[col.key] || '';

          // Convert to string and escape quotes
          value = String(value).replace(/"/g, '""');

          // Wrap in quotes if contains comma, newline, or quote
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            value = `"${value}"`;
          }

          return value;
        }).join(',');
      }) : [];

      // Combine header and rows
      const csv = [headers, ...rows].join('\n');

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_sample.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Sample download error:', error);
      alert('Failed to download sample. Please try again.');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={!data || data.length === 0}
        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={`Export ${entityName} to CSV`}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export CSV
      </button>

      {/* Import Button */}
      <div className="relative">
        <input
          type="file"
          accept=".csv"
          onChange={handleImport}
          disabled={isImporting}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          id={`csv-import-${filename}`}
        />
        <label
          htmlFor={`csv-import-${filename}`}
          className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {isImporting ? 'Importing...' : 'Import CSV'}
        </label>
      </div>

      {/* Download Sample Button */}
      <button
        onClick={handleDownloadSample}
        className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
        title={`Download sample ${entityName} CSV template`}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Sample CSV
      </button>

      {/* Success Message */}
      {importSuccess && (
        <div className="w-full sm:w-auto bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-3 rounded">
          <p className="text-sm text-green-700 dark:text-green-400">{importSuccess}</p>
        </div>
      )}

      {/* Error Message */}
      {importError && (
        <div className="w-full sm:w-auto bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3 rounded">
          <p className="text-sm text-red-700 dark:text-red-400">{importError}</p>
        </div>
      )}
    </div>
  );
}
