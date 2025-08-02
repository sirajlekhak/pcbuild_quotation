import React, { useState, useEffect, useCallback } from 'react';
import { Search, ExternalLink, Star, ShoppingCart, RefreshCw, Filter } from 'lucide-react';
import { Component } from '../types';

interface ProductSearchProps {
  onAddComponent: (component: Omit<Component, 'id' | 'quantity'>) => void;
  apiBaseUrl?: string;
}

interface ScrapedProduct {
  title: string;
  price: string;
  link: string;
  source?: string;
  warranty?: string;
  brand?: string;
  model?: string;
}

export default function ProductSearch({ onAddComponent, apiBaseUrl = 'http://localhost:5001/api' }: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<ScrapedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<'all' | 'amazon' | 'flipkart' | 'mdcomputers'>('all');

  const searchProducts = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setProducts([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${apiBaseUrl}/search?query=${encodeURIComponent(searchTerm)}&seller=${selectedSeller}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const data = await response.json();
      
      // Transform the scraped data to match our component structure
      const formattedProducts = data.map((item: any) => ({
        title: item.title || item.name || 'Unknown Product',
        price: formatPrice(item.price),
        link: item.link || '#',
        source: item.source || selectedSeller,
        warranty: item.warranty || '1 year',
        brand: extractBrand(item.title || item.name),
        model: extractModel(item.title || item.name)
      }));

      setProducts(formattedProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, selectedSeller]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (query) {
        searchProducts(query);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [query, searchProducts]);

  const formatPrice = (price: string | number): string => {
    if (typeof price === 'number') {
      return price.toString();
    }
    
    // Extract numbers from price string (e.g., "₹15,999" -> "15999")
    const numericPrice = price.replace(/[^\d]/g, '');
    return numericPrice || '0';
  };

  const extractBrand = (productName: string): string => {
    const brands = ['AMD', 'Intel', 'NVIDIA', 'ASUS', 'MSI', 'Gigabyte', 'Corsair', 'Kingston', 'Samsung', 'WD', 'Seagate'];
    const foundBrand = brands.find(b => 
      productName.toLowerCase().includes(b.toLowerCase())
    );
    return foundBrand || 'Generic';
  };

  const extractModel = (productName: string): string => {
    // Simple model extraction - you might need to improve this
    const modelPatterns = [
      /(RTX\s\d{4})/i,
      /(Ryzen\s\d\s\d{4})/i,
      /(Core\si\d-\d{4})/i,
      /(\d{4}[A-Z]*)/ // Matches 4-digit numbers with optional letters
    ];
    
    for (const pattern of modelPatterns) {
      const match = productName.match(pattern);
      if (match) return match[0];
    }
    
    return productName.split(' ').slice(0, 3).join(' ');
  };

const handleAddToQuotation = (product: ScrapedProduct) => {
  const component: Omit<Component, 'id' | 'quantity'> = {
    category: product.category || detectCategory(product.title), // Preserve category if available
    name: product.title,
    brand: product.brand || extractBrand(product.title),
    model: product.model || extractModel(product.title),
    price: parseInt(formatPrice(product.price)) || 0,
    link: product.link,
    warranty: product.warranty || '1 year'
  };
  onAddComponent(component);
};

const detectCategory = (title: string): string => {
  if (!title) return 'Other';
  
  const lower = title.toLowerCase();
  
  // CPU detection - more specific patterns first
  if (lower.match(/\b(ryzen\s[3579]|threadripper|epyc)\b/)) return 'CPU';
  if (lower.match(/\b(core\s(i[3579]|i9-|xeon)|pentium|celeron)\b/)) return 'CPU';
  
  // GPU detection
  if (lower.match(/\b(rtx\s\d{4}|gtx\s\d{4}|radeon\s(rx\s)?\d{4}|arc\sa\d{3})\b/)) return 'GPU';
  
  // Other categories with more specific patterns
  if (lower.match(/\b(ddr[45]?\s?\d{4}|memory|ram|sodimm)\b/)) return 'RAM';
  if (lower.match(/\b(b\d{3,4}|z\d{3,4}|h\d{3,4}|x\d{3,4}|motherboard|mainboard)\b/)) return 'Motherboard';
  if (lower.match(/\b(ssd|nvme|pcie\sgen\d|hard\sdisk|hdd|m\.2)\b/)) return 'Storage';
  if (lower.match(/\b(power\ssupply|psu|smps)\b/)) return 'PSU';
  if (lower.match(/\b(case|chassis|cabinet|tower)\b/)) return 'Case';
  if (lower.match(/\b(cooler|aio|liquid\scooling|heatsink|fan)\b/)) return 'Cooling';
  if (lower.match(/\b(monitor|display|screen|oled|lcd)\b/)) return 'Monitor';
  if (lower.match(/\b(keyboard|mouse|headset|speaker|webcam)\b/)) return 'Accessories';
  
  return 'Other';
};

  const getSellerColor = (seller: string) => {
    const colors: Record<string, string> = {
      amazon: 'bg-orange-100 text-orange-800',
      flipkart: 'bg-blue-100 text-blue-800',
      mdcomputers: 'bg-green-100 text-green-800'
    };
    return colors[seller.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Search className="w-5 h-5 text-purple-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Live Product Search</h2>
      </div>

      {/* Search Form */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Search for components (e.g., RTX 4060, Ryzen 5 5600X)"
            />
          </div>
          <select
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value as any)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Sellers</option>
            <option value="amazon">Amazon</option>
            <option value="flipkart">Flipkart</option>
            <option value="mdcomputers">MD Computers</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          Error: {error}
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
            <p className="text-gray-600">Searching across {selectedSeller === 'all' ? 'all sellers' : selectedSeller}...</p>
          </div>
        )}

        {!loading && products.length === 0 && query && (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No products found for "{query}"</p>
            <p className="text-sm mt-2">Try different keywords or check your spelling</p>
          </div>
        )}

        {products.map((product, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getSellerColor(product.source || '')}`}>
                    {product.source?.toUpperCase() || 'ONLINE'}
                  </span>
                </div>
                <h4 className="font-medium text-gray-800 mb-2">{product.title}</h4>
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-green-600">
                    ₹{parseInt(formatPrice(product.price)).toLocaleString('en-IN')}
                  </div>
                </div>
                {product.brand && (
                  <div className="text-sm text-gray-600 mt-1">
                    Brand: {product.brand}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <a
                  href={product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View
                </a>
                <button
                  onClick={() => handleAddToQuotation(product)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}