import React from 'react';
import { Settings, Percent, Tag, FileText } from 'lucide-react';

interface QuotationSettingsProps {
  gstRate: number;
  discountRate: number;
  notes: string;
  onGstRateChange: (rate: number) => void;
  onDiscountRateChange: (rate: number) => void;
  onNotesChange: (notes: string) => void;
}

export default function QuotationSettings({
  gstRate,
  discountRate,
  notes,
  onGstRateChange,
  onDiscountRateChange,
  onNotesChange
}: QuotationSettingsProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Settings className="w-5 h-5 text-orange-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Quotation Settings</h2>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Percent className="w-4 h-4 inline mr-2" />
            GST Rate (%)
          </label>
          <input
            type="number"
            value={gstRate}
            onChange={(e) => onGstRateChange(Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            placeholder="18"
            min="0"
            max="28"
            step="0.1"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Tag className="w-4 h-4 inline mr-2" />
            Discount Rate (%)
          </label>
          <input
            type="number"
            value={discountRate}
            onChange={(e) => onDiscountRateChange(Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            placeholder="0"
            min="0"
            max="50"
            step="0.1"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FileText className="w-4 h-4 inline mr-2" />
          Additional Notes / Terms & Conditions
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
          placeholder="Enter any additional notes, warranty terms, or special conditions..."
        />
      </div>
    </div>
  );
}