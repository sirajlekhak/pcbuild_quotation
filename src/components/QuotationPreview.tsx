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
    <div className="flex flex-col md:flex-row justify-between items-start mb-4 border-b border-gray-300 pb-3">
      <div className="mb-2 md:mb-0 max-w-xs">
        {companyInfo.logo && (
          <img
            src={companyInfo.logo}
            alt={`${companyInfo.name} Logo`}
            className="h-10 mb-1 object-contain"
          />
        )}
        <h1 className="text-xl font-bold text-blue-800">{companyInfo.name}</h1>
        <div className="text-xs text-gray-700 mt-0.5 space-y-0.5">
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
      <div className="text-xs text-gray-800 border border-gray-300 rounded p-2 w-full md:w-48 mt-2 md:mt-0 bg-gray-50">
        <h3 className="text-sm font-semibold mb-1">Quotation Info</h3>
        <p><span className="font-medium">ID:</span> {quotationId}</p>
        <p><span className="font-medium">Date:</span> {currentDate}</p>
        <p><span className="font-medium">Valid Until:</span> {validUntil}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 max-w-3xl mx-auto">
      <div className="p-2 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-100 rounded-md">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Quotation Preview</h2>
          </div>
          <div className="flex gap-1">
            <IconButton 
              icon={Printer} 
              onClick={onPrint} 
              color="blue" 
              disabled={isLoading}
              tooltip="Print Quotation"
            />
            <IconButton 
              icon={Share2} 
              onClick={onShare} 
              color="green" 
              disabled={isLoading}
              tooltip="Share Quotation"
            />
            <IconButton 
              icon={Download} 
              onClick={onGeneratePDF} 
              disabled={isLoading}
              tooltip={isLoading ? 'Generating PDF...' : 'Download PDF'}
            />
          </div>
        </div>
      </div>

      <div id="quotation-content" className="p-3 md:p-4 bg-white">
        <CompanyHeader />

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Customer Details</h3>
          <div className="bg-gray-50 p-2 rounded text-xs text-gray-800 border border-gray-200">
            <p><span className="font-medium">Name:</span> {customer.name || 'N/A'}</p>
            <p><span className="font-medium">Phone:</span> {customer.phone || 'N/A'}</p>
            <p><span className="font-medium">Email:</span> {customer.email || 'N/A'}</p>
            {customer.address && <p><span className="font-medium">Address:</span> {customer.address}</p>}
          </div>
        </div>

        {components.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Component Details</h3>
            <table className="w-full table-auto text-xs border border-gray-200 rounded overflow-hidden">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-2 py-1 text-left">Component</th>
                  <th className="px-2 py-1 text-left">Brand</th>
                  <th className="px-2 py-1 text-right">Qty</th>
                  <th className="px-2 py-1 text-right">Unit Price</th>
                </tr>
              </thead>
              <tbody>
                {components.map((c, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    <td className="px-2 py-1">{c.name}</td>
                    <td className="px-2 py-1">{c.brand}</td>
                    <td className="px-2 py-1 text-right">{c.quantity}</td>
                    <td className="px-2 py-1 text-right">{formatCurrency(c.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-xs text-gray-800 flex justify-end">
          <div className="w-full md:w-1/2 border border-gray-300 rounded p-2 bg-gray-50">
            <h4 className="text-sm font-semibold mb-2 text-gray-900">Pricing Summary</h4>
            <div className="flex justify-between mb-1">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Discount ({discountRate}%):</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>GST ({gstRate}%):</span>
              <span>{formatCurrency(gstAmount)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1 mt-1">
              <span>Total Amount:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {notes && (
          <div className="mt-3 text-xs text-gray-800">
            <h4 className="font-semibold mb-1 text-gray-900">Terms & Conditions</h4>
            <p className="bg-yellow-50 border border-yellow-200 p-2 rounded leading-relaxed whitespace-pre-wrap">{notes}</p>
          </div>
        )}

        <div className="mt-6 text-center text-2xs text-gray-400">
          <p>Generated by {companyInfo.name} - {companyInfo.website}</p>
        </div>
      </div>
    </div>
  );
};

export default QuotationPreview;