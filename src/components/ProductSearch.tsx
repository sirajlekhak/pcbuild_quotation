import React, { useState, useCallback, useMemo } from 'react';
import { Search, ExternalLink, ShoppingCart, RefreshCw, Globe } from 'lucide-react';
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
  seller?: string;
}

const COMPUTER_BRANDS = [
  'AMD', 'Intel', 'NVIDIA', 'ASUS', 'MSI', 'Gigabyte', 
  'Corsair', 'Kingston', 'Samsung', 'WD', 'Seagate',
  'Crucial', 'Thermaltake', 'EVGA', 'Zotac', 'PNY',
  'HyperX', 'ADATA', 'Toshiba', 'HP', 'Dell', 'Lenovo',
  'Cooler Master', 'Noctua', 'be quiet!', 'Fractal Design',
  'NZXT', 'Lian Li', 'Phanteks', 'Silverstone', 'Antec',
  'ASRock', 'Biostar', 'Sapphire', 'XFX', 'PowerColor',
  'Inno3D', 'Galax', 'G.Skill', 'Team Group', 'Patriot',
  'Seasonic', 'Corsair', 'EVGA', 'Super Flower', 'FSP',
  'Deepcool', 'ARCTIC', 'EKWB', 'Logitech', 'Razer',
  'SteelSeries', 'BenQ', 'Acer', 'LG', 'AOC', 'ViewSonic',
  'Ducky', 'Varmilo', 'Keychron', 'HyperX', 'ROG',
  'TUF Gaming', 'Predator', 'Alienware', 'OMEN'
];

export default function ProductSearch({ 
  onAddComponent, 
  apiBaseUrl = 'http://localhost:5001/api' 
}: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<ScrapedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<'all' | 'amazon' | 'flipkart' | 'mdcomputers' | 'bing'>('all');
  const [bingResults, setBingResults] = useState<ScrapedProduct[]>([]);
  const [searchTriggered, setSearchTriggered] = useState(false);

  const extractBrandFromTitle = (productTitle: string): string => {
    if (!productTitle) return '';
  
    // First check for multi-word brands (longer names first)
    const multiWordBrands = COMPUTER_BRANDS
      .filter(brand => brand.includes(' '))
      .sort((a, b) => b.length - a.length);
    
    for (const brand of multiWordBrands) {
      if (new RegExp(`\\b${brand.replace(/[-\s]/g, '[-\s]?')}\\b`, 'i').test(productTitle)) {
        return brand;
      }
    }
  
    // Then check single-word brands
    const singleWordBrands = COMPUTER_BRANDS.filter(brand => !brand.includes(' '));
    for (const brand of singleWordBrands) {
      const brandRegex = brand.replace(/[-\s]/g, '[-\s]?');
      if (new RegExp(`\\b${brandRegex}\\b`, 'i').test(productTitle)) {
        return brand;
      }
    }
  
    // Special cases and alternative names
    const specialCases: Record<string, string> = {
      'rog': 'ASUS ROG',
      'republic of gamers': 'ASUS ROG',
      'tuf gaming': 'ASUS TUF Gaming',
      'alienware': 'Dell Alienware',
      'predator': 'Acer Predator',
      'omen': 'HP OMEN'
    };
  
    for (const [pattern, brand] of Object.entries(specialCases)) {
      if (new RegExp(pattern, 'i').test(productTitle)) {
        return brand;
      }
    }
  
    return '';
  };

  const fetchBingResults = async (searchTerm: string) => {
    if (searchTerm.trim().length < 2) {
      setBingResults([]);
      return;
    }

    try {
      const response = await fetch(
        `${apiBaseUrl}/bing-search?query=${encodeURIComponent(searchTerm)}`
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Bing search failed');
      }

      const formattedProducts = data.results.map((item: any) => ({
        title: item.title || item.name || 'Unknown Product',
        price: typeof item.price === 'string' 
          ? parseFloat(item.price.replace(/[^\d.]/g, '')) 
          : item.price || 0,
        link: item.link || '#',
        site: 'bing',
        brand: item.brand || extractBrandFromTitle(item.title || item.name || ''),
        category: item.category || detectCategory(item.title || item.name || ''),
        warranty: item.warranty || '1 year',
        seller: item.seller || ''
      }));

      setBingResults(formattedProducts);
    } catch (err) {
      console.error('Bing search error:', err);
      setBingResults([]);
    }
  };

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 2) {
      setProducts([]);
      setBingResults([]);
      setError('Query must be at least 2 characters');
      return;
    }

    setSearchTriggered(true);
    setLoading(true);
    setError('');

    try {
      if (selectedSeller !== 'bing') {
        const response = await fetch(
          `${apiBaseUrl}/search?query=${encodeURIComponent(query)}&seller=${selectedSeller === 'all' ? 'amazon,flipkart,mdcomputers' : selectedSeller}`
        );

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Search failed');
        }

        const formattedProducts = data.results.map((item: any) => ({
          title: item.title || item.name || 'Unknown Product',
          price: typeof item.price === 'string' 
            ? parseFloat(item.price.replace(/[^\d.]/g, '')) 
            : item.price || 0,
          link: item.link || '#',
          site: item.site || selectedSeller,
          brand: extractBrandFromTitle(item.title || item.name || ''),
          category: detectCategory(item.title || item.name || ''),
          warranty: item.warranty || '1 year',
          seller: item.seller || ''
        }));

        setProducts(formattedProducts);
      }

      if (selectedSeller === 'all' || selectedSeller === 'bing') {
        await fetchBingResults(query);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, selectedSeller, query]);

  const combinedResults = useMemo(() => {
    if (!searchTriggered) return [];
    if (selectedSeller === 'bing') return bingResults;
    if (selectedSeller === 'all') return [...products, ...bingResults];
    return products;
  }, [products, bingResults, selectedSeller, searchTriggered]);

  const formatPrice = (price: string | number): number => {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
      const numericValue = parseFloat(price.replace(/[^\d.]/g, ''));
      return isNaN(numericValue) ? 0 : numericValue;
    }
    return 0;
  };

  const detectCategory = (title: string): string => {
    if (!title) return 'Other';
    
    const lower = title.toLowerCase();
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
      brand: product.brand || extractBrandFromTitle(product.title),
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
      mdcomputers: 'bg-green-100 text-green-800',
      bing: 'bg-purple-100 text-purple-800'
    };
    return colors[seller?.toLowerCase() || ''] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Live Product Search
        </h3>
        
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-12 py-2 border rounded-md"
              placeholder="Search products..."
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              <Search className="w-4 h-4" />
            </button>
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
            <option value="bing">Bing Shopping</option>
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
      ) : searchTriggered && combinedResults.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {combinedResults.map((product, index) => (
            <div key={index} className="p-3 border rounded hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-1 rounded ${getSellerColor(product.site)}`}>
                      {product.site?.toUpperCase() || 'STORE'}
                    </span>
                    {product.brand && (
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                        {product.brand}
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {product.category || detectCategory(product.title)}
                    </span>
                  </div>
                  <h4 className="font-medium">{product.title}</h4>
                  <div className="text-lg font-bold text-green-600">
                    ₹{formatPrice(product.price).toLocaleString('en-IN')}
                  </div>
                  {product.warranty && (
                    <div className="text-sm text-gray-600">Warranty: {product.warranty}</div>
                  )}
                  {product.site === 'bing' && product.seller && (
                    <div className="text-sm text-gray-600">Seller: {product.seller}</div>
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
      ) : searchTriggered && query ? (
        <div className="text-center py-4 text-gray-500">
          No products found for "{query}"
        </div>
      ) : null}
    </div>
  );
}