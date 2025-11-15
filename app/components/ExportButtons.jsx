'use client';

import { useState } from 'react';

const ExportButtons = ({ 
  reportData, 
  dateRange, 
  startDate, 
  endDate 
}) => {
  const [isExporting, setIsExporting] = useState(false);

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get period label
  const getPeriodLabel = () => {
    switch(dateRange) {
      case 'last30days': return 'Last 30 Days';
      case 'last3months': return 'Last 3 Months';
      case 'last6months': return 'Last 6 Months';
      case 'thisyear': return 'This Year';
      case 'alltime': return 'All Time';
      default: return 'Custom Period';
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!reportData) return;
    
    setIsExporting(true);
    
    try {
      const { membershipStats, revenueStats } = reportData;
      
      // Get all-time membership distribution for more accurate export
      const totalAllTimeMembers = membershipStats?.allTimeMembers || 0;
      const allTimeGold = membershipStats?.membersByPlan?.gold || 0;
      const allTimeSilverPlus = membershipStats?.membersByPlan?.silverPlus || 0;
      const allTimeSilver = membershipStats?.membersByPlan?.silver || 0;
      const allTimeNonMembership = membershipStats?.membersByPlan?.nonMembership || 0;
      
      // Use all-time members for percentage calculation to avoid 0%
      const totalForPercentage = Math.max(totalAllTimeMembers, allTimeGold + allTimeSilverPlus + allTimeSilver + allTimeNonMembership, 1);
      
      // Create CSV content
      const csvContent = [
        ['Hair & Care Unisex Salon - Reports'],
        [`Period: ${getPeriodLabel()}`],
        [`Date Range: ${formatDateForDisplay(startDate)} to ${formatDateForDisplay(endDate)}`],
        [`Generated: ${new Date().toLocaleString('en-IN')}`],
        [],
        ['SUMMARY METRICS'],
        ['Metric', 'Value'],
        ['Members in Period', membershipStats?.totalMembers || 0],
        ['All-time Members', membershipStats?.allTimeMembers || 0],
        ['New Customers in Period', membershipStats?.newCustomersInPeriod || 0],
        ['Period Revenue (₹)', (revenueStats?.totalRevenue || 0).toLocaleString('en-IN')],
        ['Current Month Revenue (₹)', (revenueStats?.thisMonth || 0).toLocaleString('en-IN')],
        ['Previous Month Revenue (₹)', (revenueStats?.lastMonth || 0).toLocaleString('en-IN')],
        ['Growth Rate (%)', revenueStats?.growth || 0],
        ['Points Issued', (revenueStats?.totalPointsIssued || 0).toLocaleString('en-IN')],
        ['Points Redeemed', (revenueStats?.totalPointsRedeemed || 0).toLocaleString('en-IN')],
        ['Average Service Value (₹)', (revenueStats?.averageServiceValue || 0).toLocaleString('en-IN')],
        ['Retention Rate (%)', membershipStats?.retentionRate || 0],
        [],
        ['MEMBERSHIP DISTRIBUTION (All-Time)'],
        ['Membership Type', 'Count', 'Percentage'],
        ['Gold', allTimeGold, `${Math.round((allTimeGold / totalForPercentage) * 100)}%`],
        ['Silver Plus', allTimeSilverPlus, `${Math.round((allTimeSilverPlus / totalForPercentage) * 100)}%`],
        ['Silver', allTimeSilver, `${Math.round((allTimeSilver / totalForPercentage) * 100)}%`],
        ['Non-Membership Plans', allTimeNonMembership, `${Math.round((allTimeNonMembership / totalForPercentage) * 100)}%`]
      ];
      
      // Convert to CSV string with proper escaping
      const csvString = csvContent.map(row => 
        row.map(cell => {
          const cellStr = String(cell);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ).join('\n');
      
      // Create and download file with better browser compatibility
      const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        // For IE/Edge
        window.navigator.msSaveOrOpenBlob(blob, `salon-report-${getPeriodLabel().toLowerCase().replace(/ /g, '-')}-${new Date().toISOString().split('T')[0]}.csv`);
      } else {
        // For other browsers
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `salon-report-${getPeriodLabel().toLowerCase().replace(/ /g, '-')}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!reportData) return;
    
    setIsExporting(true);
    
    try {
      const { membershipStats, revenueStats } = reportData;
      
      // Get all-time membership distribution for more accurate export
      const totalAllTimeMembers = membershipStats?.allTimeMembers || 0;
      const allTimeGold = membershipStats?.membersByPlan?.gold || 0;
      const allTimeSilverPlus = membershipStats?.membersByPlan?.silverPlus || 0;
      const allTimeSilver = membershipStats?.membersByPlan?.silver || 0;
      const allTimeNonMembership = membershipStats?.membersByPlan?.nonMembership || 0;
      
      // Use all-time members for percentage calculation to avoid 0%
      const totalForPercentage = Math.max(totalAllTimeMembers, allTimeGold + allTimeSilverPlus + allTimeSilver + allTimeNonMembership, 1);
      
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Salon Report - ${getPeriodLabel()}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #8B5CF6;
            }
            .header h1 {
              color: #8B5CF6;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .metrics {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 20px;
              margin: 30px 0;
            }
            .metric-card {
              border: 1px solid #E5E7EB;
              border-radius: 8px;
              padding: 20px;
              background: #F9FAFB;
            }
            .metric-title {
              font-size: 14px;
              color: #6B7280;
              margin-bottom: 8px;
            }
            .metric-value {
              font-size: 32px;
              font-weight: bold;
              color: #111827;
              margin-bottom: 8px;
            }
            .metric-subtitle {
              font-size: 14px;
              color: #6B7280;
            }
            .section {
              margin: 30px 0;
            }
            .section h2 {
              color: #8B5CF6;
              border-bottom: 1px solid #E5E7EB;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .membership-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .membership-table th,
            .membership-table td {
              border: 1px solid #E5E7EB;
              padding: 12px;
              text-align: left;
            }
            .membership-table th {
              background: #F3F4F6;
              font-weight: bold;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #E5E7EB;
              text-align: center;
              color: #6B7280;
              font-size: 12px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Hair & Care Unisex Salon</h1>
            <p><strong>Business Report - ${getPeriodLabel()}</strong></p>
            <p>Period: ${formatDateForDisplay(startDate)} to ${formatDateForDisplay(endDate)}</p>
            <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
          </div>

          <div class="metrics">
            <div class="metric-card">
              <div class="metric-title">Members in Period</div>
              <div class="metric-value">${membershipStats?.totalMembers || 0}</div>
              <div class="metric-subtitle">+${membershipStats?.newCustomersInPeriod || 0} customers | All-time: ${membershipStats?.allTimeMembers || 0} members</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Period Revenue</div>
              <div class="metric-value">₹${revenueStats?.totalRevenue?.toLocaleString('en-IN') || 0}</div>
              <div class="metric-subtitle">Current Month: ₹${revenueStats?.thisMonth?.toLocaleString('en-IN') || 0} (${revenueStats?.growth >= 0 ? '+' : ''}${revenueStats?.growth || 0}%)</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Points Issued</div>
              <div class="metric-value">${revenueStats?.totalPointsIssued?.toLocaleString('en-IN') || 0}</div>
              <div class="metric-subtitle">${revenueStats?.totalPointsRedeemed?.toLocaleString('en-IN') || 0} redeemed (${revenueStats?.totalPointsIssued > 0 ? Math.round((revenueStats?.totalPointsRedeemed || 0) / revenueStats?.totalPointsIssued * 100) : 0}%)</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Retention Rate</div>
              <div class="metric-value">${membershipStats?.retentionRate || 0}%</div>
              <div class="metric-subtitle">Excellent | Industry avg: 65%</div>
            </div>
          </div>

          <div class="section">
            <h2>Membership Distribution (All-Time)</h2>
            <table class="membership-table">
              <thead>
                <tr>
                  <th>Membership Type</th>
                  <th>Count</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Gold</td>
                  <td>${allTimeGold}</td>
                  <td>${Math.round((allTimeGold / totalForPercentage) * 100)}%</td>
                </tr>
                <tr>
                  <td>Silver Plus</td>
                  <td>${allTimeSilverPlus}</td>
                  <td>${Math.round((allTimeSilverPlus / totalForPercentage) * 100)}%</td>
                </tr>
                <tr>
                  <td>Silver</td>
                  <td>${allTimeSilver}</td>
                  <td>${Math.round((allTimeSilver / totalForPercentage) * 100)}%</td>
                </tr>
                <tr>
                  <td>Non-Membership Plans</td>
                  <td>${allTimeNonMembership}</td>
                  <td>${Math.round((allTimeNonMembership / totalForPercentage) * 100)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Revenue Analysis</h2>
            <p><strong>Total Revenue for Period:</strong> ₹${revenueStats?.totalRevenue?.toLocaleString('en-IN') || 0}</p>
            <p><strong>Average Service Value:</strong> ₹${revenueStats?.averageServiceValue?.toLocaleString('en-IN') || 0}</p>
            <p><strong>Month-over-Month Growth:</strong> ${revenueStats?.growth >= 0 ? '+' : ''}${revenueStats?.growth || 0}%</p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Hair & Care Unisex Salon. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={exportToPDF}
        disabled={isExporting || !reportData}
        className="px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {isExporting ? 'Exporting...' : 'Export PDF'}
      </button>
      
      <button 
        onClick={exportToCSV}
        disabled={isExporting || !reportData}
        className="px-3 py-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {isExporting ? 'Exporting...' : 'Export CSV'}
      </button>
    </div>
  );
};

export default ExportButtons;