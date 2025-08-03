import React, { useState } from 'react';
import { Monitor, Cpu, Zap, Globe } from 'lucide-react';
import CustomerForm from './components/CustomerForm';
import ComponentSelector from './components/ComponentSelector';
import QuotationSettings from './components/QuotationSettings';
import QuotationPreview from './components/QuotationPreview';
import { Component, Customer } from './types';
import { generatePDF, printQuotation, shareQuotation } from './utils/pdfGenerator';
import logo from './assets/logo.jpg'; // Adjust the path to your logo

function App() {
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const [components, setComponents] = useState<Component[]>([]);
  const [gstRate, setGstRate] = useState(18);
  const [discountRate, setDiscountRate] = useState(0);
  const [notes, setNotes] = useState(`• All prices are inclusive of GST
• This quotation is valid for 30 days from the date of issue
• Warranty terms as mentioned for individual components
• Installation and setup service available
• Payment terms: 50% advance, 50% on delivery`);

  const isQuotationReady = customer.name && customer.phone && components.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                {/* Company Logo */}
                <img 
                  src={logo} 
                  alt="IT SERVICE WORLD Logo" 
                  className="h-16 w-auto object-contain"
                />
                {/* Gradient Icon (optional - you can remove this if you don't want both) */}
                
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">IT SERVICE WORLD</h1>
                <p className="text-gray-600">PC Build Quotation Generator</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>Professional PC Builds</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-600" />
                <span>Expert Service</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-600" />
                <span>Live Price Updates</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Rest of your component remains the same */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Forms */}
          <div className="space-y-8">
            <CustomerForm customer={customer} onChange={setCustomer} />
            <ComponentSelector components={components} onChange={setComponents} />
            <QuotationSettings
              gstRate={gstRate}
              discountRate={discountRate}
              notes={notes}
              onGstRateChange={setGstRate}
              onDiscountRateChange={setDiscountRate}
              onNotesChange={setNotes}
            />
          </div>

          {/* Right Column - Preview */}
          <div className="lg:sticky lg:top-8">
            {isQuotationReady ? (
              <QuotationPreview
                customer={customer}
                components={components}
                gstRate={gstRate}
                discountRate={discountRate}
                notes={notes}
                onGeneratePDF={generatePDF}
                onPrint={printQuotation}
                onShare={shareQuotation}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 text-center">
                <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Monitor className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Quotation Preview</h3>
                <p className="text-gray-600">
                  Fill in customer details and add components to see the quotation preview
                </p>
                <div className="mt-6 text-sm text-gray-500">
                  <p>Required:</p>
                  <ul className="mt-2 space-y-1">
                    <li className={customer.name ? 'text-green-600' : 'text-gray-500'}>
                      ✓ Customer name {customer.name ? '✓' : ''}
                    </li>
                    <li className={customer.phone ? 'text-green-600' : 'text-gray-500'}>
                      ✓ Phone number {customer.phone ? '✓' : ''}
                    </li>
                    <li className={components.length > 0 ? 'text-green-600' : 'text-gray-500'}>
                      ✓ At least one component {components.length > 0 ? '✓' : ''}
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">IT SERVICE WORLD</h3>
            <p className="text-gray-400 mb-2">
              Your trusted partner for PC builds and IT services
            </p>
            <p className="text-gray-500 text-sm">
              Crafted with ❤️ by{' '}
              <a
                href="https://github.com/sirajlekhak"
                className="underline hover:text-blue-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                @ITLOGICLABS
              </a>
            </p>
            <div className="flex justify-center gap-8 text-sm text-gray-400 mt-4">
              <span>Siliguri, West Bengal</span>
              <span>•</span>
              <span>Professional Service</span>
              <span>•</span>
              <span>Quality Components</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;