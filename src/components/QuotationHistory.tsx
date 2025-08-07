import React, { useEffect, useState } from 'react';
import { X, FileText, Download, Search, RefreshCw } from 'lucide-react';
import { loadPDFInfo } from '../utils/pdfStorage';

interface QuotationHistoryProps {
  onLoadQuotation: (item: any) => void;
  onClose: () => void;
}

const QuotationHistory = ({ onLoadQuotation, onClose }: QuotationHistoryProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const pdfInfos = await loadPDFInfo();
      // Ensure we have an array before mapping
      const formattedHistory = Array.isArray(pdfInfos) ? pdfInfos.map(info => ({
        id: info.id,
        date: info.date,
        customer: info.customer || { name: '', phone: '' },
        pdfData: info.pdfData,
        quotationNumber: info.id,
        type: info.type || 'quotation',
        components: info.components || [],
        totalAmount: info.totalAmount || 0,
        notes: info.notes || ''
      })) : [];
      
      setHistory(formattedHistory);
    } catch (err) {
      console.error('Failed to load history:', err);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const onSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const filteredHistory = history.filter(item => {
    if (!item) return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.customer?.name?.toLowerCase().includes(searchLower) ||
      item.customer?.phone?.includes(searchTerm) ||
      item.quotationNumber?.toLowerCase().includes(searchLower)
    );
  });

return (
  <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl mx-auto">
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-3">
        <FileText className="w-7 h-7 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Document History</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredHistory.length} {filteredHistory.length === 1 ? 'document' : 'documents'} found
          </p>
        </div>
      </div>
      <button 
        onClick={onClose}
        className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Close history"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    <div className="mb-6 relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by customer, document #, phone, or date"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>

    {isLoading ? (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading documents...</p>
      </div>
    ) : filteredHistory.length === 0 ? (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">
          {searchTerm ? 'No documents found' : 'No history yet'}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {searchTerm ? 'Try a different search term' : 'Create your first document to get started'}
        </p>
      </div>
    ) : (
      <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
        {filteredHistory.map((item) => (
          <div 
            key={item.id} 
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    item.type === 'invoice' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {item.type === 'invoice' ? 'Invoice' : 'Quotation'}
                  </span>
                  <h3 className="font-medium text-gray-900 truncate">{item.quotationNumber}</h3>
                </div>
                <p className="text-gray-700 mt-1 truncate">{item.customer.name}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                  <span>{new Date(item.date).toLocaleDateString()}</span>
                  <span>{item.components.length} items</span>
                  <span className="font-medium text-gray-900">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR'
                    }).format(item.totalAmount)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => onLoadQuotation(item)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Load
                </button>
                <a
                  href={item.pdfData}
                  download={`${item.type === 'invoice' ? 'Invoice' : 'Quotation'}_${item.quotationNumber}.pdf`}
                  className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm transition-colors flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </a>
              </div>
            </div>
            {item.notes && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600 line-clamp-2">{item.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);
};

export default QuotationHistory;