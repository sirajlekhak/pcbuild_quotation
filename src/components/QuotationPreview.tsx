import React from 'react';
import { FileText, Download, Printer, Share2 } from 'lucide-react';
import { Component, Customer, CompanyInfo } from '../types';

interface QuotationPreviewProps {
  customer: Customer;
  components: Component[];
  gstRate: number;
  discountRate: number;
  notes: string;
  onGeneratePDF: () => Promise<void>;
  onPrint: () => void;
  onShare: () => Promise<void>;
  isLoading?: boolean;
}

const companyInfo: CompanyInfo = {
  name: 'IT SERVICE WORLD',
  address: 'Siliguri, West Bengal, India',
  phone: '+91 XXXXX XXXXX',
  email: 'info@itserviceworld.com',
  gstin: 'XXXXXXXXXXXXXXX',
  website: 'www.itserviceworld.com',
  logo: '/path/to/logo.png' // Add your logo path here
};

export default function QuotationPreview({
  customer,
  components,
  gstRate,
  discountRate,
  notes,
  onGeneratePDF,
  onPrint,
  onShare,
  isLoading = false
}: QuotationPreviewProps) {
  const subtotal = components.reduce((sum, component) => sum + (component.price * component.quantity), 0);
  const discountAmount = (subtotal * discountRate) / 100;
  const taxableAmount = subtotal - discountAmount;
  const gstAmount = (taxableAmount * gstRate) / 100;
  const totalAmount = taxableAmount + gstAmount;

  const quotationId = `QUO-${Date.now().toString().slice(-6)}`;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const handleAction = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 max-w-6xl mx-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Quotation Preview</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onPrint}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={() => handleAction(onShare)}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={() => handleAction(onGeneratePDF)}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isLoading ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      <div id="quotation-content" className="p-6 print:p-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-200 pb-6 print:flex-row">
          <div className="mb-4 md:mb-0">
            {companyInfo.logo && (
              <img 
                src={companyInfo.logo} 
                alt={`${companyInfo.name} Logo`} 
                className="h-16 mb-2 object-contain"
              />
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-blue-600">{companyInfo.name}</h1>
          </div>
          <div className="text-gray-600 space-y-1 text-sm md:text-base text-center md:text-right">
            <p>{companyInfo.address}</p>
            <p>{companyInfo.phone} | {companyInfo.email}</p>
            <p>GSTIN: {companyInfo.gstin}</p>
            {companyInfo.website && (
              <p className="text-blue-600 hover:underline">
                <a href={`https://${companyInfo.website}`} target="_blank" rel="noopener noreferrer">
                  {companyInfo.website}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Quotation Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-8 print:grid-cols-2">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Customer Details</h3>
            <div className="space-y-2 text-gray-600">
              <p><span className="font-medium">Name:</span> {customer.name || 'N/A'}</p>
              <p><span className="font-medium">Phone:</span> {customer.phone || 'N/A'}</p>
              <p><span className="font-medium">Email:</span> {customer.email || 'N/A'}</p>
              {customer.address && <p><span className="font-medium">Address:</span> {customer.address}</p>}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Quotation Details</h3>
            <div className="space-y-2 text-gray-600">
              <p><span className="font-medium">Quotation ID:</span> {quotationId}</p>
              <p><span className="font-medium">Date:</span> {currentDate}</p>
              <p><span className="font-medium">Valid Until:</span> {validUntil}</p>
            </div>
          </div>
        </div>

        {/* Components Table */}
        {components.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Components</h3>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full border border-gray-200 rounded-lg print:w-full">
                <thead className="bg-gray-50 print:bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Component
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Product
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Unit Price (₹)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Total (₹)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {components.map((component, index) => (
                    <tr key={component.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{component.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="font-medium">{component.name}</div>
                        <div className="text-xs text-gray-500">
                          {component.brand} {component.model && `• ${component.model}`}
                          {component.warranty && ` • Warranty: ${component.warranty}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{component.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {component.price.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {(component.price * component.quantity).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pricing Summary */}
        <div className="border-t border-gray-200 pt-6">
          <div className="max-w-md ml-auto">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discountRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-600">Discount ({discountRate}%):</span>
                  <span className="text-green-600">-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Taxable Amount:</span>
                <span className="text-gray-900">₹{taxableAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST ({gstRate}%):</span>
                <span className="text-gray-900">₹{gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-semibold">
                <span>Total Amount:</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Terms & Conditions</h3>
          <div className="text-gray-600 whitespace-pre-wrap">
            {notes || (
              <ol className="list-decimal pl-5 space-y-2">
                <li>Prices are inclusive of all taxes unless specified otherwise.</li>
                <li>This quotation is valid for 30 days from the date of issue.</li>
                <li>Payment terms: 50% advance, 50% before delivery.</li>
                <li>Delivery timeline: 3-5 working days after payment confirmation.</li>
                <li>Warranty as per manufacturer's terms and conditions.</li>
              </ol>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 mt-8 text-center text-gray-500 text-sm">
          <p>Thank you for choosing {companyInfo.name}!</p>
          <p className="mt-2">For any queries, please contact us at {companyInfo.phone} or {companyInfo.email}</p>
          <p className="mt-2">This quotation is valid until {validUntil}</p>
        </div>
      </div>
    </div>
  );
}