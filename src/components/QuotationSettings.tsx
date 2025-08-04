import React, { useState, useEffect } from 'react';
import { Settings, Percent, Tag, FileText, Edit, Building, Save } from 'lucide-react';
import { CompanyInfo } from '../types';

interface QuotationSettingsProps {
  gstRate: number;
  discountRate: number;
  notes: string;
  onGstRateChange: (rate: number) => void;
  onDiscountRateChange: (rate: number) => void;
  onNotesChange: (notes: string) => void;
  onCompanyInfoChange: (info: CompanyInfo) => void;
}

const defaultCompanyInfo: CompanyInfo = {
  name: 'IT SERVICE WORLD',
  address: 'Siliguri, West Bengal, India',
  phone: '+91 XXXXX XXXXX',
  email: 'info@itserviceworld.com',
  gstin: 'XXXXXXXXXXXXXXX',
  website: 'www.itserviceworld.com',
  logo: ''
};

export default function QuotationSettings({
  gstRate,
  discountRate,
  notes,
  onGstRateChange,
  onDiscountRateChange,
  onNotesChange,
  onCompanyInfoChange
}: QuotationSettingsProps) {
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(defaultCompanyInfo);
  const [tempCompanyInfo, setTempCompanyInfo] = useState<CompanyInfo>(defaultCompanyInfo);

  const handleCompanyEdit = () => {
    setTempCompanyInfo(companyInfo);
    setShowCompanyModal(true);
  };

  useEffect(() => {
  const loadCompanyInfo = async () => {
    console.log('Loading company info...');
    try {
      const response = await fetch('http://localhost:5001/api/company', {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      // First check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got: ${text.substring(0, 100)}...`);
      }

      const data = await response.json();
      console.log('Loaded company info:', data);
      
      setCompanyInfo(data);
      setTempCompanyInfo(data);
      onCompanyInfoChange(data);
      
    } catch (error) {
      console.error('Error loading company info:', error);
      // Fallback to default if API fails
      setCompanyInfo(DEFAULT_COMPANY_INFO);
      setTempCompanyInfo(DEFAULT_COMPANY_INFO);
    }
  };
  
  loadCompanyInfo();
}, []);

const handleCompanySave = async () => {
  try {
    const response = await fetch('http://localhost:5001/api/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tempCompanyInfo),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save company info');
    }

    setCompanyInfo(tempCompanyInfo);
    setShowCompanyModal(false);
    
  } catch (error) {
    console.error('Save error:', error);
    alert(`Save failed: ${error.message}`);
  }
};

  const handleCompanyInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTempCompanyInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setTempCompanyInfo(prev => ({
            ...prev,
            logo: event.target?.result as string
          }));
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Settings className="w-5 h-5 text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Quotation Settings</h2>
        </div>
        <button
          onClick={handleCompanyEdit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Company Info
        </button>
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

      {/* Company Info Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                Company Information
              </h3>
              <button 
                onClick={() => setShowCompanyModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    name="name"
                    value={tempCompanyInfo.name}
                    onChange={handleCompanyInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    name="gstin"
                    value={tempCompanyInfo.gstin}
                    onChange={handleCompanyInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  name="address"
                  value={tempCompanyInfo.address}
                  onChange={handleCompanyInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={tempCompanyInfo.phone}
                    onChange={handleCompanyInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={tempCompanyInfo.email}
                    onChange={handleCompanyInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="text"
                    name="website"
                    value={tempCompanyInfo.website}
                    onChange={handleCompanyInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {tempCompanyInfo.logo && (
                    <div className="mt-2">
                      <img 
                        src={tempCompanyInfo.logo} 
                        alt="Company Logo Preview" 
                        className="h-16 object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCompanyModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompanySave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Company Info
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}