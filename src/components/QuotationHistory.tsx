import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Search, RefreshCw, Eye, Printer, Share2, Trash2 } from 'lucide-react';
import { loadPDFInfo, deletePDFInfo } from '../utils/pdfStorage';
import type { PDFInfo } from '../utils/pdfStorage';

interface QuotationHistoryItem {
  id: string;
  date: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  pdfData: string;
  quotationNumber: string;
  type: 'quotation' | 'invoice';
  components: Array<{
    name: string;
    brand: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  notes?: string;
}

interface QuotationHistoryProps {
  onLoadQuotation: (item: QuotationHistoryItem) => void;
  onClose: () => void;
}

export const QuotationHistory = ({ onLoadQuotation, onClose }: QuotationHistoryProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState<QuotationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<QuotationHistoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const pdfInfos = await loadPDFInfo();
      const formattedHistory = Array.isArray(pdfInfos) 
        ? pdfInfos.map((info: PDFInfo) => ({
            ...info,
            quotationNumber: info.id,
            customer: info.customer || { name: '', phone: '' },
            components: info.components || [],
             totalAmount: info.totalAmount || calculateTotalAmount(info)
          }))
        : [];
      
      setHistory(formattedHistory);
    } catch (err) {
      console.error('Failed to load history:', err);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalAmount = (info: PDFInfo): number => {
    if (info.totalAmount) return info.totalAmount;
    
    const subtotal = (info.components || []).reduce(
      (sum, c) => sum + (c.price || 0) * (c.quantity || 1), 
      0
    );
    const discountAmount = (subtotal * (info.discountRate || 0)) / 100;
    const taxableAmount = subtotal - discountAmount;
    const gstAmount = (taxableAmount * (info.gstRate || 0)) / 100;
    
    return taxableAmount + gstAmount;
  };

  const handlePrint = (pdfData: string) => {
    const printWindow = window.open(pdfData);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }
  };

  const handleShare = async (item: QuotationHistoryItem) => {
    try {
      const response = await fetch(item.pdfData);
      const blob = await response.blob();
      const file = new File([blob], `${item.type}_${item.quotationNumber}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${item.type === 'invoice' ? 'Invoice' : 'Quotation'}`,
          text: `Here's your ${item.type} from ${item.customer.name}`,
          files: [file]
        });
      } else {
        downloadPDF(item.pdfData, `${item.type}_${item.quotationNumber}.pdf`);
        alert('PDF downloaded. Please share it manually.');
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };

// In your QuotationHistory.tsx
const handleDelete = async (id: string) => {
  if (window.confirm('Are you sure you want to delete this document?')) {
    setDeletingId(id);
    try {
      // Ensure deletePDFInfo is properly imported
      const success = await deletePDFInfo(id);
      if (success) {
        setHistory(prev => prev.filter(item => item.id !== id));
        if (previewItem?.id === id) {
          setPreviewItem(null);
        }
        // Optional: Show success message
      } else {
        alert('Failed to delete document');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting document. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }
};

  const downloadPDF = (pdfData: string, filename: string) => {
    const a = document.createElement('a');
    a.href = pdfData;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const filteredHistory = history.filter(item => {
    if (!item) return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.customer.name.toLowerCase().includes(searchLower) ||
      item.customer.phone.includes(searchTerm) ||
      item.quotationNumber.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-5xl mx-auto border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Document History</h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredHistory.length} {filteredHistory.length === 1 ? 'document' : 'documents'} found
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close history"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400 w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by customer, document #, phone, or date"
              className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 text-gray-700"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-600">Loading documents...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              {searchTerm ? 'No documents found' : 'No history yet'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try a different search term' : 'Create your first document to get started'}
            </p>
            {!searchTerm && (
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Create New Document
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
            {filteredHistory.map((item) => (
              <div 
                key={item.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all group bg-white"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                        item.type === 'invoice' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.type === 'invoice' ? 'Invoice' : 'Quotation'}
                      </span>
                      <h3 className="font-semibold text-gray-900 truncate">{item.quotationNumber}</h3>
                    </div>
                    <p className="text-gray-800 mt-2 truncate font-medium">{item.customer.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        {formatDate(item.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                        {item.components.length} items
                      </span>
                      <span className="font-medium text-blue-600">
                        {formatCurrency(item.totalAmount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onLoadQuotation(item)}
                      className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      title="Load"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => downloadPDF(item.pdfData, `${item.type}_${item.quotationNumber}.pdf`)}
                      className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center justify-center min-w-[40px]"
                      title="Delete"
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-700"></div>
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                {item.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600 line-clamp-2">{item.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {previewItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {previewItem.type === 'invoice' ? 'Invoice' : 'Quotation'}: {previewItem.quotationNumber}
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  {formatDate(previewItem.date)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrint(previewItem.pdfData)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                  title="Print"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleShare(previewItem)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                  title="Share"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => downloadPDF(previewItem.pdfData, `${previewItem.type}_${previewItem.quotationNumber}.pdf`)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(previewItem.id)}
                  className="p-2 rounded-lg hover:bg-red-100 text-red-700 transition-colors flex items-center justify-center min-w-[40px]"
                  title="Delete"
                  disabled={deletingId === previewItem.id}
                >
                  {deletingId === previewItem.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-700"></div>
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe 
                src={previewItem.pdfData}
                className="w-full h-full min-h-[70vh] border-0"
                title={`${previewItem.type === 'invoice' ? 'Invoice' : 'Quotation'} Preview`}
              />
            </div>
            <div className="p-4 border-t bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-800">{previewItem.customer.name}</p>
                  <p className="text-gray-600 text-sm">{previewItem.customer.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-semibold text-blue-600 text-lg">
                    {formatCurrency(previewItem.totalAmount)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuotationHistory;