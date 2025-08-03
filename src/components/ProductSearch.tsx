import React, { useState, useEffect, useCallback } from 'react';
import { Search, ExternalLink, ShoppingCart, RefreshCw } from 'lucide-react';
import { Component } from '../types';

interface ProductSearchProps {
  onAddComponent: (component: Omit<Component, 'id' | 'quantity'>) => void;
  apiBaseUrl?: string;
}

interface ScrapedProduct {
  title: string;
  price: string | number;
  link: string;
  site?: string;
  warranty?: string;
  brand?: string;
  category?: string;
}

export default function ProductSearch({ 
  onAddComponent, 
  apiBaseUrl = 'http://localhost:5001/api' 
}: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<ScrapedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<'all' | 'amazon' | 'flipkart' | 'mdcomputers'>('all');

  // Improved search with debouncing and error handling
const searchProducts = useCallback(async (searchTerm: string) => {
  if (searchTerm.trim().length < 2) {
    setProducts([]);
    return;
  }

  setLoading(true);
  setError('');

  try {
    const response = await fetch(
      `${apiBaseUrl}/search?query=${encodeURIComponent(searchTerm)}&seller=${selectedSeller}`
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Search failed');
    }

    // Transform backend response to frontend format
    const formattedProducts = data.results.map((item: any) => ({
      title: item.title || 'Unknown Product',
      price: typeof item.price === 'string' 
        ? parseFloat(item.price.replace(/[^\d.]/g, '')) 
        : item.price || 0,
      link: item.link || '#',
      site: item.site || selectedSeller,
      brand: item.brand || extractBrand(item.title),
      category: item.category || detectCategory(item.title)
    }));

    setProducts(formattedProducts);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to search products');
    setProducts([]);
  } finally {
    setLoading(false);
  }
}, [apiBaseUrl, selectedSeller]);

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchProducts(query);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [query, searchProducts]);

  // Helper functions
  const formatPrice = (price: string | number): number => {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
      // Remove currency symbols and commas
      const numericValue = parseFloat(price.replace(/[^\d.]/g, ''));
      return isNaN(numericValue) ? 0 : numericValue;
    }
    return 0;
  };

  const extractBrand = (productName: string): string => {
    const brands = ['AMD', 'Intel', 'NVIDIA', 'ASUS', 'MSI', 'Gigabyte', 'Corsair', 'Kingston', 'Samsung', 'WD', 'Seagate'];
    const foundBrand = brands.find(brand => 
      productName.toLowerCase().includes(brand.toLowerCase())
    );
    return foundBrand || 'Unknown';
  };

  const detectCategory = (title: string): string => {
    if (!title) return 'Other';
    
    const lower = title.toLowerCase();
    
    // Improved category detection with more specific patterns
    if (lower.match(/\b(ryzen|core\si[3579]|xeon|pentium|celeron)\b/)) return 'CPU';
    if (lower.match(/\b(rtx|gtx|radeon|arc|gpu|graphics\scard)\b/)) return 'GPU';
    if (lower.match(/\b(ddr[45]?|ram|memory)\b/)) return 'RAM';
    if (lower.match(/\b(b[0-9]{3}|z[0-9]{3}|h[0-9]{3}|x[0-9]{3}|motherboard)\b/)) return 'Motherboard';
    if (lower.match(/\b(ssd|nvme|hdd|hard\sdisk|m\.2)\b/)) return 'Storage';
    if (lower.match(/\b(psu|power\ssupply|smps)\b/)) return 'PSU';
    if (lower.match(/\b(case|chassis|cabinet)\b/)) return 'Case';
    if (lower.match(/\b(cooler|aio|fan|heatsink)\b/)) return 'Cooling';
    if (lower.match(/\b(monitor|display|screen)\b/)) return 'Monitor';
    if (lower.match(/\b(keyboard|mouse|headset)\b/)) return 'Accessories';
    
    return 'Other';
  };

  const handleAddToQuotation = (product: ScrapedProduct) => {
    const component: Omit<Component, 'id' | 'quantity'> = {
      category: product.category || detectCategory(product.title),
      name: product.title,
      brand: product.brand || extractBrand(product.title),
      price: formatPrice(product.price),
      link: product.link,
      warranty: product.warranty || '1 year'
    };
    onAddComponent(component);
  };

  const getSellerColor = (seller?: string) => {
    const colors: Record<string, string> = {
      amazon: 'bg-orange-100 text-orange-800',
      flipkart: 'bg-blue-100 text-blue-800',
      mdcomputers: 'bg-green-100 text-green-800'
    };
    return colors[seller?.toLowerCase() || ''] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Live Product Search</h3>
        
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-md"
              placeholder="Search products..."
            />
          </div>
          <select
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value as any)}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">All Sellers</option>
            <option value="amazon">Amazon</option>
            <option value="flipkart">Flipkart</option>
            <option value="mdcomputers">MD Computers</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-4">
          <RefreshCw className="animate-spin mr-2" />
          <span>Searching...</span>
        </div>
      ) : products.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {products.map((product, index) => (
            <div key={index} className="p-3 border rounded hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-1 rounded ${getSellerColor(product.site)}`}>
                      {product.site?.toUpperCase() || 'STORE'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {product.category || detectCategory(product.title)}
                    </span>
                  </div>
                  <h4 className="font-medium">{product.title}</h4>
                  <div className="text-lg font-bold text-green-600">
                    ₹{formatPrice(product.price).toLocaleString('en-IN')}
                  </div>
                  {product.brand && (
                    <div className="text-sm text-gray-600">Brand: {product.brand}</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                  >
                    <ExternalLink size={16} /> View
                  </a>
                  <button
                    onClick={() => handleAddToQuotation(product)}
                    className="bg-blue-600 text-white px-2 py-1 rounded text-sm flex items-center gap-1 hover:bg-blue-700"
                  >
                    <ShoppingCart size={16} /> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : query ? (
        <div className="text-center py-4 text-gray-500">
          No products found for "{query}"
        </div>
      ) : null}
    </div>
  );
}