import React, { useState, useEffect, useCallback } from 'react';
import { Search, ExternalLink, Star, ShoppingCart, RefreshCw, Filter } from 'lucide-react';
import { ProductData, priceService } from '../services/priceService';
import { Component } from '../types';

interface ProductSearchProps {
  onAddComponent: (component: Omit<Component, 'id' | 'quantity'>) => void;
  searchQuery?: string;
  category?: string;
}

export default function ProductSearch({ onAddComponent, searchQuery = '', category }: ProductSearchProps) {
  const [query, setQuery] = useState(searchQuery);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<'all' | 'amazon' | 'flipkart' | 'mdcomputers'>('all');
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'name'>('price');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 100000 });

  const searchProducts = useCallback(async (searchTerm: string) => {
  if (!searchTerm.trim()) return;

  setLoading(true);
  try {
    let products: ProductData[] = [];

    if (selectedSeller === 'amazon') {
      const response = await fetch(`http://localhost:5001/api/search?query=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();

      products = data.map((item: any) => ({
        name: item.title,
        price: parseInt(item.price.replace(/[^\d]/g, '')) || 0,
        productUrl: item.link,
        rating: null,
        originalPrice: null,
        lastUpdated: new Date(),
        seller: 'amazon',
      }));
    } else {
      const result = await priceService.searchProducts(searchTerm, category);
      products = result.products;
    }

    setProducts(products);
  } catch (error) {
    console.error('Search error:', error);
    setProducts([]);
  } finally {
    setLoading(false);
  }
}, [category, selectedSeller]);


  useEffect(() => {
    if (searchQuery) {
      setQuery(searchQuery);
      searchProducts(searchQuery);
    }
  }, [searchQuery, searchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchProducts(query);
  };

  const filteredProducts = products.filter(product => {
    const sellerMatch = selectedSeller === 'all' || product.seller === selectedSeller;
    const priceMatch = product.price >= priceRange.min && product.price <= priceRange.max;
    return sellerMatch && priceMatch;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price - b.price;
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const handleAddToQuotation = (product: ProductData) => {
    const component: Omit<Component, 'id' | 'quantity'> = {
      category: category as Component['category'] || 'Other',
      name: product.name,
      brand: extractBrand(product.name),
      model: extractModel(product.name),
      price: product.price,
      link: product.productUrl,
      warranty: getDefaultWarranty(category)
    };
    onAddComponent(component);
  };

  const extractBrand = (productName: string): string => {
    const brands = ['AMD', 'Intel', 'NVIDIA', 'ASUS', 'MSI', 'Gigabyte', 'Corsair', 'Kingston', 'Samsung', 'WD', 'Seagate'];
    const brand = brands.find(b => productName.toLowerCase().includes(b.toLowerCase()));
    return brand || 'Generic';
  };

  const extractModel = (productName: string): string => {
    // Extract model from product name (simplified)
    const words = productName.split(' ');
    return words.slice(0, 3).join(' ');
  };

  const getDefaultWarranty = (category?: string): string => {
    const warrantyMap: Record<string, string> = {
      'CPU': '3 years',
      'GPU': '3 years',
      'RAM': 'Lifetime',
      'Motherboard': '3 years',
      'Storage': '5 years',
      'PSU': '5 years',
      'Case': '2 years',
      'Cooling': '2 years'
    };
    return warrantyMap[category || ''] || '1 year';
  };

  const getSellerLogo = (seller: string) => {
    const logos = {
      amazon: '🛒',
      flipkart: '🛍️',
      mdcomputers: '💻'
    };
    return logos[seller as keyof typeof logos] || '🏪';
  };

  const getSellerColor = (seller: string) => {
    const colors = {
      amazon: 'bg-orange-100 text-orange-800',
      flipkart: 'bg-blue-100 text-blue-800',
      mdcomputers: 'bg-green-100 text-green-800'
    };
    return colors[seller as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-3">
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
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="grid md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Filter className="w-4 h-4 inline mr-1" />
            Seller
          </label>
          <select
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Sellers</option>
            <option value="amazon">Amazon</option>
            <option value="flipkart">Flipkart</option>
            <option value="mdcomputers">MD Computers</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
          >
            <option value="price">Price (Low to High)</option>
            <option value="rating">Rating (High to Low)</option>
            <option value="name">Name (A to Z)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
          <input
            type="number"
            value={priceRange.min}
            onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
          <input
            type="number"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
            placeholder="100000"
          />
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
            <p className="text-gray-600">Searching across Amazon, Flipkart, and MD Computers...</p>
          </div>
        )}

        {!loading && filteredProducts.length === 0 && query && (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No products found for "{query}"</p>
            <p className="text-sm mt-2">Try different keywords or check your spelling</p>
          </div>
        )}

        {filteredProducts.map((product, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getSellerColor(product.seller)}`}>
                    {getSellerLogo(product.seller)} {product.seller.toUpperCase()}
                  </span>
                  {product.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{product.rating}</span>
                    </div>
                  )}
                </div>
                <h4 className="font-medium text-gray-800 mb-2 line-clamp-2">{product.name}</h4>
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-green-600">
                    ₹{product.price.toLocaleString('en-IN')}
                  </div>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <div className="text-sm text-gray-500 line-through">
                      ₹{product.originalPrice.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Last updated: {product.lastUpdated.toLocaleTimeString()}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <a
                  href={product.productUrl}
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

      {filteredProducts.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Showing {filteredProducts.length} products • Prices updated in real-time
        </div>
      )}
    </div>
  );
}