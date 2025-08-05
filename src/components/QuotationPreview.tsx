// Professional QuotationPreview component with polished layout and styling
import React from 'react';
import { FileText, Download, Printer, Share2 } from 'lucide-react';
import type { Component, Customer, CompanyInfo } from '../types';

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
  companyInfo: CompanyInfo;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount).replace('₹', '₹');

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const QuotationPreview = ({
  customer,
  components,
  gstRate,
  discountRate,
  notes,
  onGeneratePDF,
  onPrint,
  onShare,
  isLoading = false,
  companyInfo
}: QuotationPreviewProps) => {
  const subtotal = components.reduce((sum, c) => sum + (c.price * c.quantity), 0);
  const discountAmount = (subtotal * discountRate) / 100;
  const taxableAmount = subtotal - discountAmount;
  const gstAmount = (taxableAmount * gstRate) / 100;
  const totalAmount = taxableAmount + gstAmount;

  const quotationId = `QUO-${Date.now().toString().slice(-6)}`;
  const currentDate = formatDate(new Date());
  const validUntil = formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  const ActionButton = ({ icon: Icon, onClick, label, color = 'blue', disabled = false }: {
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void | Promise<void>;
    label: string;
    color?: string;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 bg-${color}-600 hover:bg-${color}-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Icon className="w-4 h-4" />
      {disabled && label === 'Download PDF' ? 'Generating...' : label}
    </button>
  );

  const CompanyHeader = () => (
    <div className="flex flex-col md:flex-row justify-between items-start mb-8 border-b border-gray-300 pb-6 print:flex-row">
      <div className="mb-4 md:mb-0 max-w-md">
        {companyInfo.logo && (
          <img
            src={companyInfo.logo}
            alt={`${companyInfo.name} Logo`}
            className="h-16 mb-2 object-contain"
          />
        )}
        <h1 className="text-3xl font-extrabold text-blue-800 tracking-tight">{companyInfo.name}</h1>
        <div className="text-sm text-gray-700 mt-1 space-y-1">
          <p>{companyInfo.address}</p>
          <p>{companyInfo.phone} | {companyInfo.email}</p>
          <p>GSTIN: {companyInfo.gstin}</p>
          {companyInfo.website && (
            <a
              href={`https://${companyInfo.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {companyInfo.website}
            </a>
          )}
        </div>
      </div>
      <div className="text-sm text-gray-800 border border-gray-300 rounded-lg p-4 w-full md:w-64 mt-4 md:mt-0 bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">Quotation Info</h3>
        <p><span className="font-medium">Quotation ID:</span> {quotationId}</p>
        <p><span className="font-medium">Date:</span> {currentDate}</p>
        <p><span className="font-medium">Valid Until:</span> {validUntil}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-6xl mx-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Quotation Preview</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Printer} onClick={onPrint} label="Print" color="gray" disabled={isLoading} />
            <ActionButton icon={Share2} onClick={onShare} label="Share" color="green" disabled={isLoading} />
            <ActionButton icon={Download} onClick={onGeneratePDF} label="Download PDF" disabled={isLoading} />
          </div>
        </div>
      </div>

      <div id="quotation-content" className="p-6 md:p-10 bg-white max-w-[794px] mx-auto">
        <CompanyHeader />

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Details</h3>
          <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-800 border border-gray-200">
            <p><span className="font-medium">Name:</span> {customer.name || 'N/A'}</p>
            <p><span className="font-medium">Phone:</span> {customer.phone || 'N/A'}</p>
            <p><span className="font-medium">Email:</span> {customer.email || 'N/A'}</p>
            {customer.address && <p><span className="font-medium">Address:</span> {customer.address}</p>}
          </div>
        </div>

        {components.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Component Details</h3>
            <table className="w-full table-auto text-sm border border-gray-200 rounded-md overflow-hidden">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Component</th>
                  <th className="px-4 py-2 text-left">Brand</th>
                  
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Unit Price</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {components.map((c, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2">{c.brand}</td>
                    
                    <td className="px-4 py-2 text-right">{c.quantity}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(c.price)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(c.price * c.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-sm text-gray-800 flex justify-end">
          <div className="w-full md:w-1/2 border border-gray-300 rounded-md p-4 bg-gray-50">
            <h4 className="text-base font-semibold mb-4 text-gray-900">Pricing Summary</h4>
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Discount ({discountRate}%):</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>GST ({gstRate}%):</span>
              <span>{formatCurrency(gstAmount)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2 mt-2">
              <span>Total Amount:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {notes && (
          <div className="mt-6 text-sm text-gray-800">
            <h4 className="font-semibold mb-2 text-gray-900">Terms & Conditions</h4>
            <p className="bg-yellow-50 border border-yellow-200 p-3 rounded-md leading-relaxed whitespace-pre-wrap">{notes}</p>
          </div>
        )}

        <div className="mt-12 text-center text-xs text-gray-400">
          <p>Generated by {companyInfo.name} - {companyInfo.website}</p>
        </div>
      </div>
    </div>
  );
};
export default QuotationPreview;