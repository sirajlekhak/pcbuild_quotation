import React, { useState } from 'react';
import { FileText, Download, Printer, Share2, Clock, Search } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { PDFInfo } from '@/utils/pdfStorage';
// Add this import with other imports
import { savePDFInfo } from '@/utils/pdfStorage';

interface QuotationHistoryItem {
  id: string;
  date: string;
  customerName: string;
  phone: string;
  pdfData: string;
  quotationNumber: string;
  type?: 'quotation' | 'invoice';
  totalAmount?: number;
}

interface PDFGenerationOptions {
  filename: string;
  forPrint?: boolean;
  forShare?: boolean;
}

export const QuotationPreview = ({
  customer,
  components,
  gstRate,
  discountRate,
  notes,
  isLoading = false,
  companyInfo,
  history,
  onSaveHistory
}: QuotationPreviewProps) => {
  const [isInvoiceMode, setIsInvoiceMode] = useState(false);
  
  // Generate consistent IDs for both modes
const [documentId] = useState(() => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return {
    quotation: `QUO-${datePart}-${randomPart}`,
    invoice: `INV-${datePart}-${randomPart}`
  };
});

const subtotal = components.reduce((sum, c) => sum + (c.price || 0) * (c.quantity || 1), 0);
const discountAmount = (subtotal * (discountRate || 0)) / 100;
const taxableAmount = subtotal - discountAmount;
const gstAmount = (taxableAmount * (gstRate || 0)) / 100;
const totalAmount = taxableAmount + gstAmount;

  const currentDate = new Date().toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
  
const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
});

  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationHistoryItem | null>(null);

const generatePDF = async (options: PDFGenerationOptions) => {
  const element = document.getElementById('quotation-content');
  if (!element) {
    throw new Error('Element not found for PDF generation');
  }

  const pdfOptions = {
    margin: [10, 10, 10, 10],
    filename: options.filename,
    image: { type: 'jpeg', quality: 1 },
    html2canvas: {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollY: 0
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      after: '.pdf-pagebreak'
    }
  };

  try {
    const pdfData = await html2pdf().set(pdfOptions).from(element).output('datauristring');
    return pdfData;
  } catch (err) {
    console.error('PDF generation error:', err);
    throw new Error('Failed to generate PDF');
  }
};

 const handlePrint = async () => {
  try {
    const filename = isInvoiceMode 
      ? `PC_Build_Invoice_${documentId.invoice}.pdf`
      : `PC_Build_Quotation_${documentId.quotation}.pdf`;

    const pdfData = await generatePDF({ filename, forPrint: true });
    if (!pdfData) throw new Error('No PDF data generated');

    const blob = dataURItoBlob(pdfData);
    const pdfUrl = URL.createObjectURL(blob);
    
    const printWindow = window.open(pdfUrl);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }
  } catch (err) {
    console.error('Print error:', err);
    alert(`Error printing document: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

  const handleShare = async () => {
  try {
    const filename = isInvoiceMode 
      ? `Invoice_${documentId.invoice}.pdf`
      : `Quotation_${documentId.quotation}.pdf`;

    const pdfData = await generatePDF({ filename, forShare: true });
    if (!pdfData) throw new Error('No PDF data generated');

    const blob = dataURItoBlob(pdfData);
    const pdfFile = new File([blob], filename, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
      await navigator.share({
        title: isInvoiceMode ? 'PC Build Invoice' : 'PC Build Quotation',
        text: isInvoiceMode ? 'Here is your PC build invoice' : 'Check out this PC build quotation',
        files: [pdfFile]
      });
    } else {
      downloadPDF(pdfData, filename);
      alert('PDF downloaded. Please share it manually.');
    }
  } catch (err) {
    console.error('Share error:', err);
    if (err instanceof Error && err.name !== 'AbortError') {
      alert(`Error sharing document: ${err.message}`);
    }
  }
};

// Update the handleGeneratePDF function in QuotationPreview.tsx
const handleGeneratePDF = async () => {
  try {
    const filename = isInvoiceMode 
      ? `PC_Build_Invoice_${documentId.invoice}.pdf`
      : `PC_Build_Quotation_${documentId.quotation}.pdf`;

    const pdfData = await generatePDF({ filename });
    if (!pdfData) throw new Error('No PDF data generated');

    const pdfInfo: PDFInfo = {
      id: isInvoiceMode ? documentId.invoice : documentId.quotation,
      date: new Date().toISOString(),
      customer: {
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || ''
      },
      components: components.map(c => ({
        name: c.name,
        brand: c.brand,
        quantity: c.quantity,
        price: c.price
      })),
      subtotal,
      discountRate,
      discountAmount,
      gstRate,
      gstAmount,
      totalAmount,
      notes,
      pdfData,
      type: isInvoiceMode ? 'invoice' : 'quotation'
    };

    // Save to storage
    await savePDFInfo(pdfInfo);
    
    // Call the existing onSaveHistory function
    onSaveHistory(pdfData);

    // Download the PDF
    downloadPDF(pdfData, filename);

  } catch (err) {
    console.error('PDF generation error:', err);
    alert(`Failed to generate PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

  const downloadPDF = (pdfData: string, filename: string) => {
    const blob = dataURItoBlob(pdfData);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const filteredHistory = history.filter(item => {
    if (!item || !item.customerName || !item.quotationNumber) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      item.customerName.toLowerCase().includes(searchLower) ||
      item.phone.includes(searchTerm) ||
      item.quotationNumber.toLowerCase().includes(searchLower)
    );
  });

  const viewQuotation = (item: QuotationHistoryItem) => {
    setSelectedQuotation(item);
  };

  const closeViewer = () => {
    setSelectedQuotation(null);
  };

  const IconButton = ({ 
    icon: Icon, 
    onClick, 
    color = 'blue',
    disabled = false,
    tooltip
  }: {
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void | Promise<void>;
    color?: string;
    disabled?: boolean;
    tooltip: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`
        p-1 rounded-full transition-colors text-xs
        bg-${color}-600 hover:bg-${color}-700 text-white
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center
        relative group
      `}
    >
      <Icon className="w-3 h-3" />
      <span className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
        {tooltip}
      </span>
    </button>
  );

  const CompanyHeader = () => (
    <div className="flex flex-col md:flex-row justify-between items-start mb-4 border-b border-gray-300 pb-3 print:flex-row">
      <div className="mb-2 md:mb-0 max-w-xs print:max-w-full">
        {companyInfo.logo && (
          <img
            src={companyInfo.logo}
            alt={`${companyInfo.name} Logo`}
            className="h-10 mb-1 object-contain print:h-12"
          />
        )}
        <h1 className="text-xl font-bold text-blue-800 print:text-2xl">{companyInfo.name}</h1>
        <div className="text-xs text-gray-700 mt-0.5 space-y-0.5 print:text-sm">
          <p>{companyInfo.address}</p>
          <p>{companyInfo.phone} | {companyInfo.email}</p>
          <p>GSTIN: {companyInfo.gstin}</p>
          {companyInfo.website && (
            <a
              href={`https://${companyInfo.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline print:text-black"
            >
              {companyInfo.website}
            </a>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-800 border border-gray-300 rounded p-2 w-full md:w-48 mt-2 md:mt-0 bg-gray-50 print:text-sm">
        <h3 className="text-sm font-semibold mb-1">
          {isInvoiceMode ? 'Invoice Info' : 'Quotation Info'}
        </h3>
        <p><span className="font-medium">ID:</span> {isInvoiceMode ? documentId.invoice : documentId.quotation}</p>
        <p><span className="font-medium">Date:</span> {currentDate}</p>
        {!isInvoiceMode && <p><span className="font-medium">Valid Until:</span> {validUntil}</p>}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 max-w-3xl mx-auto print:shadow-none print:border-0 print:max-w-full">
      <div className="p-2 border-b border-gray-200 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-100 rounded-md">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">
              {isInvoiceMode ? 'Invoice Preview' : 'Quotation Preview'}
            </h2>
            <label className="relative inline-flex items-center cursor-pointer ml-2">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isInvoiceMode}
                onChange={() => setIsInvoiceMode(!isInvoiceMode)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-sm font-medium text-gray-700">
                {isInvoiceMode ? 'Invoice' : 'Quotation'}
              </span>
            </label>
          </div>
          <div className="flex gap-1">
            <IconButton 
              icon={Printer} 
              onClick={handlePrint} 
              color="blue" 
              disabled={isLoading}
              tooltip={isInvoiceMode ? 'Print Invoice' : 'Print Quotation'}
            />
            <IconButton 
              icon={Share2} 
              onClick={handleShare} 
              color="green" 
              disabled={isLoading}
              tooltip={isInvoiceMode ? 'Share Invoice' : 'Share Quotation'}
            />
            <IconButton 
              icon={Download} 
              onClick={handleGeneratePDF} 
              disabled={isLoading}
              tooltip={isLoading ? 'Generating PDF...' : isInvoiceMode ? 'Download Invoice' : 'Download Quotation'}
            />
          </div>
        </div>
      </div>

      

      {selectedQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {isInvoiceMode ? 'Invoice' : 'Quotation'}: {selectedQuotation.quotationNumber}
              </h3>
              <button onClick={closeViewer} className="text-gray-500 hover:text-gray-700">
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe 
                src={selectedQuotation.pdfData}
                className="w-full h-full min-h-[70vh] border-0"
                title={`${isInvoiceMode ? 'Invoice' : 'Quotation'} PDF Viewer`}
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => downloadPDF(selectedQuotation.pdfData, 
                  isInvoiceMode 
                    ? `Invoice_${selectedQuotation.quotationNumber}.pdf`
                    : `Quotation_${selectedQuotation.quotationNumber}.pdf`)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Download
              </button>
              <button
                onClick={closeViewer}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="quotation-content" className="p-3 md:p-4 bg-white print:p-6">
        <CompanyHeader />

        <div className="mb-4 print:mb-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-1 print:text-base">Customer Details</h3>
          <div className="bg-gray-50 p-2 rounded text-xs text-gray-800 border border-gray-200 print:text-sm">
            <p><span className="font-medium">Name:</span> {customer.name || 'N/A'}</p>
            <p><span className="font-medium">Phone:</span> {customer.phone || 'N/A'}</p>
            <p><span className="font-medium">Email:</span> {customer.email || 'N/A'}</p>
            {customer.address && <p><span className="font-medium">Address:</span> {customer.address}</p>}
          </div>
        </div>

        {components.length > 0 && (
          <div className="mb-4 print:mb-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-1 print:text-base">Component Details</h3>
<table className="w-full table-auto text-xs border border-gray-200 rounded overflow-hidden print:text-sm">
  <thead className="bg-gray-100 text-gray-700">
    <tr>
      <th className="px-2 py-1 text-left">Component</th>
      <th className="px-2 py-1 text-left">Brand</th>
      <th className="px-2 py-1 text-right">Qty</th>
      <th className="px-2 py-1 text-right">Unit Price</th>
      <th className="px-2 py-1 text-right">Total</th>
    </tr>
  </thead>
  <tbody>
    {components.map((c, i) => {
      const unitPrice = c.price || 0;
      const quantity = c.quantity || 1;
      const totalPrice = unitPrice * quantity;
      
      return (
        <tr key={i} className="border-t border-gray-200">
          <td className="px-2 py-1">{c.name}</td>
          <td className="px-2 py-1">{c.brand}</td>
          <td className="px-2 py-1 text-right">{quantity}</td>
          <td className="px-2 py-1 text-right">
            {new Intl.NumberFormat('en-IN', { 
              style: 'currency', 
              currency: 'INR' 
            }).format(unitPrice).replace('₹', '₹')}
          </td>
          <td className="px-2 py-1 text-right">
            {new Intl.NumberFormat('en-IN', { 
              style: 'currency', 
              currency: 'INR' 
            }).format(totalPrice).replace('₹', '₹')}
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
          </div>
        )}

        <div className="text-xs text-gray-800 flex justify-end print:text-sm">
          <div className="w-full md:w-1/2 border border-gray-300 rounded p-2 bg-gray-50">
            <h4 className="text-sm font-semibold mb-2 text-gray-900 print:text-base">Pricing Summary</h4>
            <div className="flex justify-between mb-1">
              <span>Subtotal:</span>
              <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(subtotal).replace('₹', '₹')}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Discount ({discountRate}%):</span>
              <span>-{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(discountAmount).replace('₹', '₹')}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>GST ({gstRate}%):</span>
              <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(gstAmount).replace('₹', '₹')}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1 mt-1">
              <span>Total Amount:</span>
              <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalAmount).replace('₹', '₹')}</span>
            </div>
          </div>
        </div>

        {notes && (
          <div className="mt-3 text-xs text-gray-800 print:text-sm">
            <h4 className="font-semibold mb-1 text-gray-900 print:text-base">
              {isInvoiceMode ? 'Payment Terms' : 'Terms & Conditions'}
            </h4>
            <p className="bg-yellow-50 border border-yellow-200 p-2 rounded leading-relaxed whitespace-pre-wrap">{notes}</p>
          </div>
        )}

        <div className="mt-6 text-center text-2xs text-gray-400 print:text-xs">
          <p>Generated by {companyInfo.name} - {companyInfo.website}</p>
          <p className="mt-1">
            {isInvoiceMode ? 'Invoice' : 'Quotation'} ID: {isInvoiceMode ? documentId.invoice : documentId.quotation}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuotationPreview;