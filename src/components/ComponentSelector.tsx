import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Plus, 
  Search, 
  Package, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Globe, 
  Download, 
  Upload, 
  CheckCircle, 
  RefreshCw // Add this import
} from 'lucide-react';
import ProductSearch from './ProductSearch';

interface Component {
  id: string;
  name: string;
  brand: string; // Changed from optional
  price: number; // Changed from optional
  quantity: number; // Changed from optional
  category: string;
  warranty?: string;
  link?: string;
  model?: string;
}

interface ComponentSelectorProps {
  components: Component[];
  onChange: (components: Component[]) => void;
}


function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  
  const debounced = (...args: Parameters<T>) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };

  debounced.cancel = () => {
    clearTimeout(timeout);
  };

  return debounced;
}

const API_BASE = 'http://localhost:5001/api';

export default function ComponentSelector({ components = [], onChange }: ComponentSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<{ name: string; price: string; quantity: string }>({
    name: '',
    price: '',
    quantity: ''
  });
  const [showManualForm, setShowManualForm] = useState(false);
  const [newComponent, setNewComponent] = useState<Omit<Component, 'id' | 'quantity'>>({
    category: 'CPU',
    name: '',
    brand: '',
    price: 0,
    warranty: '',
  });
  const [editingCatalogComponentId, setEditingCatalogComponentId] = useState<string | null>(null);
  const [showLiveSearch, setShowLiveSearch] = useState(false);
  const [backendComponents, setBackendComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const categories = ['All', 'CPU', 'GPU', 'RAM', 'Motherboard', 'Storage', 'PSU', 'Case', 'Cooling', 'Monitor', 'Accessories', 'Other'];

  const exportComponents = async () => {
    try {
      const response = await fetch(`${API_BASE}/components`);
      if (!response.ok) throw new Error('Failed to fetch components');
      
      const data = await response.json();
      const componentsToExport = data.components || [];
      
      const dataStr = JSON.stringify(componentsToExport, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `components_backup_${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export components');
    }
  };

  const refreshComponents = useCallback(async (search = '', category = 'All') => {
    try {
      setLoading(true);
      setError('');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category !== 'All') params.append('category', category);
      
      const url = `${API_BASE}/components?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch components');
      
      const data = await response.json();
      setBackendComponents(data.components?.map((comp: any) => ({
        ...comp,
        id: comp.id || uuidv4()
      })) || []);
      
      setSuccessMessage('Components refreshed successfully!');
    } catch (err) {
      console.error('Refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh components');
    } finally {
      setLoading(false);
    }
  }, []);

    const debouncedRefresh = useMemo(
    () => debounce(refreshComponents, 500),
    [refreshComponents]
  );

useEffect(() => {
  debouncedRefresh(searchTerm, selectedCategory);
  return () => {
    if (debouncedRefresh.cancel) {
      debouncedRefresh.cancel();
    }
  };
}, [searchTerm, selectedCategory, debouncedRefresh]);


  const importComponents = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        
        if (!Array.isArray(parsedData)) {
          throw new Error('Invalid file format - expected array of components');
        }

        const validComponents = parsedData.filter(comp => 
          comp.name && comp.brand && comp.price !== undefined && comp.category
        );

        if (validComponents.length !== parsedData.length) {
          console.warn('Some components were invalid and were filtered out');
        }

        const response = await fetch(`${API_BASE}/components/import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ components: validComponents }),
        });

        if (!response.ok) {
          throw new Error('Failed to save imported components');
        }

        // Refresh the components from the backend
        const fetchResponse = await fetch(`${API_BASE}/components`);
        const data = await fetchResponse.json();
        setBackendComponents(data.components || []);
        
        setSuccessMessage('Components imported successfully!');
        setError('');
      } catch (err) {
        console.error('Import failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to import components');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    const fetchComponents = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE}/components`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch components');
        }
        const data = await response.json();
        if (data.success) {
          setBackendComponents(data.components || []);
        } else {
          throw new Error(data.error || 'Invalid response format');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch components');
        setBackendComponents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchComponents();
  }, []); 

  const detectCategory = (title: string | undefined | null) => {
    if (!title) return 'Other';
    const lower = title.toLowerCase();
    if (lower.match(/\b(i5|i7|i9|ryzen|core|pentium|celeron|xeon)\b/)) return 'CPU';
    if (lower.match(/\b(rtx|gtx|radeon|gpu|graphics)\b/)) return 'GPU';
    if (lower.includes('ram') || lower.includes('ddr')) return 'RAM';
    if (lower.includes('motherboard') || /\b(b\d{3,4}|z\d{3,4}|h\d{3,4}|x\d{3,4})\b/.test(lower)) return 'Motherboard';
    if (lower.includes('ssd') || lower.includes('hdd') || lower.includes('nvme') || lower.includes('hard drive')) return 'Storage';
    if (lower.includes('psu') || lower.includes('power supply')) return 'PSU';
    if (lower.includes('case') || lower.includes('cabinet') || lower.includes('chassis')) return 'Case';
    if (lower.includes('cooler') || lower.includes('fan') || lower.includes('aio') || lower.includes('heatsink')) return 'Cooling';
    if (lower.includes('monitor') || lower.includes('display') || lower.includes('screen')) return 'Monitor';
    if (lower.includes('keyboard') || lower.includes('mouse') || lower.includes('headset') || lower.includes('accessory')) return 'Accessories';
    return 'Other';
  };

const filteredSampleComponents = useMemo(() => {
  if (!backendComponents || !Array.isArray(backendComponents)) return [];
  
  return backendComponents.filter(component => {
    if (!component) return false;
    
    const name = component.name?.toLowerCase() || '';
    const brand = component.brand?.toLowerCase() || '';
    const category = component.category?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = 
      name.includes(searchLower) ||
      brand.includes(searchLower) ||
      category.includes(searchLower);
    
    const matchesCategory = 
      selectedCategory === 'All' || 
      component.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });
}, [searchTerm, selectedCategory, backendComponents]);

const addComponent = (componentData: Component) => {
  // Validate required fields
  if (!componentData.name?.trim()) {
    setError('Component name cannot be empty');
    return;
  }
  if (componentData.price === undefined || componentData.price <= 0) {
    setError('Price must be greater than 0');
    return;
  }

  const newComp: Component = {
    ...componentData,
    id: uuidv4(), // Changed from Date.now()
    quantity: componentData.quantity || 1,
    price: componentData.price,
    category: componentData.category || detectCategory(componentData.name)
  };
  onChange([...components, newComp]);
  setSuccessMessage('Component added successfully!');
};

  const handleEdit = (component: Component) => {
    setEditingComponentId(component.id);
    setEditBuffer({
      name: component.name,
      price: component.price?.toString() || '0',
      quantity: component.quantity?.toString() || '1'
    });
  };

  const handleSave = (id: string) => {
    onChange(components.map(comp =>
      comp.id === id ? {
        ...comp,
        name: editBuffer.name,
        price: Number(editBuffer.price),
        quantity: Number(editBuffer.quantity),
        category: detectCategory(editBuffer.name)
      } : comp
    ));
    setEditingComponentId(null);
    setSuccessMessage('Component updated successfully!');
  };

  const removeComponent = (id: string) => {
    onChange(components.filter(comp => comp.id !== id));
    setSuccessMessage('Component removed successfully!');
  };

  const calculateComponentTotal = (component: Component) => {
    return (component.price || 0) * (component.quantity || 1);
  };

  const handleAddOrUpdateComponent = async () => {
    try {
      setLoading(true);
      setError('');

      if (!newComponent.name?.trim()) {
        throw new Error('Component name is required');
      }
      if (!newComponent.brand?.trim()) {
        throw new Error('Brand is required');
      }
      if (newComponent.price === undefined || newComponent.price <= 0) {
        throw new Error('Valid price is required');
      }

      const url = editingCatalogComponentId 
        ? `${API_BASE}/components/${editingCatalogComponentId}`
        : `${API_BASE}/components`;

      const method = editingCatalogComponentId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: newComponent.category,
          name: newComponent.name,
          brand: newComponent.brand,
          price: newComponent.price,
          warranty: newComponent.warranty || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Request failed');
      }

      const savedComponent = await response.json();

      // Update the backendComponents state immediately
      if (editingCatalogComponentId) {
        setBackendComponents(prev => prev.map(comp => 
          comp.id === editingCatalogComponentId ? savedComponent : comp
        ));
        setSuccessMessage('Component updated successfully!');
      } else {
        setBackendComponents(prev => [...prev, savedComponent]);
        setSuccessMessage('Component added to catalog successfully!');
      }

      // Reset form
      setNewComponent({
        category: 'CPU',
        name: '',
        brand: '',
        price: 0,
        warranty: '',
      });
      setEditingCatalogComponentId(null);
      setShowManualForm(false);
      
    } catch (err) {
      console.error('Error saving component:', err);
      setError(err instanceof Error ? err.message : 'Failed to save component');
    } finally {
      setLoading(false);
    }
  };

  const handleEditFromCatalog = (component: Component) => {
    setEditingCatalogComponentId(component.id);
    setNewComponent({
      category: component.category,
      name: component.name,
      brand: component.brand,
      price: component.price || 0,
      warranty: component.warranty || ''
    });
    setShowManualForm(true);
    setShowAddForm(false);
  };

  const handleDeleteFromCatalog = async (componentId: string) => {
    try {
      const response = await fetch(`${API_BASE}/components/${componentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete component');
      
      // Update the state immediately
      setBackendComponents(prev => prev.filter(comp => comp.id !== componentId));
      setSuccessMessage('Component deleted successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete component');
    }
  };

  const handleExportClick = () => {
    exportComponents();
    setShowLiveSearch(false);
    setShowAddForm(false);
    setShowManualForm(false);
  };

  const handleImportClick = () => {
    setShowLiveSearch(false);
    setShowAddForm(false);
    setShowManualForm(false);
  };

  const toggleLiveSearch = () => {
    setShowLiveSearch(!showLiveSearch);
    if (!showLiveSearch) {
      setShowAddForm(false);
      setShowManualForm(false);
    }
  };

  const toggleCatalog = () => {
    setShowAddForm(!showAddForm);
    if (!showAddForm) {
      setShowLiveSearch(false);
      setShowManualForm(false);
    }
  };

  const toggleManualForm = () => {
    setShowManualForm(!showManualForm);
    if (!showManualForm) {
      setShowLiveSearch(false);
      setShowAddForm(false);
      setEditingCatalogComponentId(null);
      setNewComponent({
        category: 'CPU',
        name: '',
        brand: '',
        price: 0,
        warranty: '',
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          Error: {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {loading && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-md">
          Loading components...
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Components Selection</h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleExportClick}
            className="p-2 bg-yellow-600 text-white rounded-full hover:bg-yellow-700 transition-colors flex items-center justify-center"
            title="Export components"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <label className="p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors flex items-center justify-center cursor-pointer"
            title="Import components">
            <Upload className="w-4 h-4" />
            <input 
              type="file" 
              accept=".json" 
              onChange={importComponents}
              onClick={handleImportClick}
              className="hidden"
            />
          </label>

          <button
            onClick={toggleLiveSearch}
            className={`p-2 ${showLiveSearch ? 'bg-purple-700' : 'bg-purple-600'} text-white rounded-full hover:bg-purple-700 transition-colors flex items-center justify-center`}
            title="Live search"
          >
            <Globe className="w-4 h-4" />
          </button>

          <button
            onClick={toggleCatalog}
            className={`p-2 ${showAddForm ? 'bg-blue-700' : 'bg-blue-600'} text-white rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center`}
            title="Browse catalog"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={toggleManualForm}
            className={`p-2 ${showManualForm ? 'bg-green-700' : 'bg-green-600'} text-white rounded-full hover:bg-green-700 transition-colors flex items-center justify-center`}
            title="Add component"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected Components */}
{components.length > 0 && (
  <div className="mb-6">
    <h3 className="text-lg font-medium text-gray-800 mb-4">Selected Components</h3>
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
      {components.map((component) => (
        <div key={`selected-${component.id}`} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          {editingComponentId === component.id ? (
            <div className="grid md:grid-cols-4 gap-3">
              <input
                type="text"
                value={editBuffer.name}
                onChange={(e) => setEditBuffer(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Component name"
              />
              <input
                type="number"
                value={editBuffer.price}
                onChange={(e) => setEditBuffer(prev => ({ ...prev, price: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Price"
              />
              <input
                type="number"
                value={editBuffer.quantity}
                onChange={(e) => setEditBuffer(prev => ({ ...prev, quantity: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Quantity"
                min="1"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(component.id)}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingComponentId(null)}
                  className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {component.category}
                  </span>
                  <h4 className="font-medium text-gray-800">{component.name}</h4>
                  {component.link && (
                    <a
                      href={component.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {component.brand} • ₹{(component.price || 0).toLocaleString('en-IN')} × {component.quantity} = ₹{(calculateComponentTotal(component) || 0).toLocaleString('en-IN')}
                  {component.warranty && <span className="ml-2">• Warranty: {component.warranty}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(component)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeComponent(component.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}

      {/* Live Product Search */}
      {showLiveSearch && (
        <div className="mb-6">
          <ProductSearch 
          onAddComponent={(componentData) => {
            if (!componentData.name?.trim()) {
              setError('Component name is required')
              return;
            }
            if (componentData.price === undefined || componentData.price <= 0) {
              setError('Price must be greater than 0');
              return;
            }
            const newComp: Component = {
              ...componentData,
              id: uuidv4(), // Changed from Date.now()
              quantity: 1,
              category: componentData.category || detectCategory(componentData.name)
            };
            onChange([...components, newComp]);
            setSuccessMessage('Component added from search!');
          }} 
            apiBaseUrl={API_BASE}
          />
        </div>
      )}

      {/* Component Form (Add/Edit) */}
      {showManualForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {editingCatalogComponentId ? 'Edit Component' : 'Add Custom Component'}
          </h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAddOrUpdateComponent();
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category*</label>
                <select
                  value={newComponent.category}
                  onChange={(e) => setNewComponent({...newComponent, category: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {categories.filter(c => c !== 'All').map(category => (
                    <option key={`category-${category}`} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
                <input
                  type="text"
                  value={newComponent.name}
                  onChange={(e) => setNewComponent({...newComponent, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. AMD Ryzen 5 5600X"
                  required
                  minLength={2}
                />
                {!newComponent.name && (
                  <p className="text-red-500 text-xs mt-1">Name is required</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand*</label>
                <input
                  type="text"
                  value={newComponent.brand}
                  onChange={(e) => setNewComponent({...newComponent, brand: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. AMD"
                  required
                  minLength={2}
                />
                {!newComponent.brand && (
                  <p className="text-red-500 text-xs mt-1">Brand is required</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)*</label>
                <input
                  type="number"
                  value={newComponent.price || ''}
                  onChange={(e) => setNewComponent({...newComponent, price: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 15999"
                  min="1"
                  step="1"
                  required
                />
                {(newComponent.price === undefined || newComponent.price <= 0) && (
                  <p className="text-red-500 text-xs mt-1">Valid price is required</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty</label>
                <input
                  type="text"
                  value={newComponent.warranty}
                  onChange={(e) => setNewComponent({...newComponent, warranty: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 3 years"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={!newComponent.name || !newComponent.brand || !newComponent.price || newComponent.price <= 0}
              >
                {editingCatalogComponentId ? 'Update Component' : 'Add Component'}
              </button>
              <button
                type="button"
                onClick={toggleManualForm}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Component Catalog */}
{/* Component Catalog */}
{showAddForm && (
  <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
    <h3 className="text-lg font-medium text-gray-800 mb-4">Browse Component Catalog</h3>
<button
  onClick={() => refreshComponents(searchTerm, selectedCategory)}
  className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors flex-shrink-0"
  title="Refresh search results"
  disabled={loading}
>
  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
</button>
    
<div className="flex flex-col md:flex-row gap-4 mb-4">
  <div className="flex-1 flex items-center gap-2">
  <div className="flex-1 relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      placeholder="Search components..."
    />
  </div>
  <button
    onClick={() => refreshComponents(searchTerm, selectedCategory)}
    className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors flex-shrink-0"
    title="Refresh search results"
    disabled={loading}
  >
    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
  </button>
  </div>
  <select
    value={selectedCategory}
    onChange={(e) => setSelectedCategory(e.target.value)}
    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  >
    {categories.map(category => (
      <option key={`select-${category}`} value={category}>{category}</option>
    ))}
  </select>
</div>

    {loading ? (
      <div className="text-center py-4">Loading components...</div>
    ) : filteredSampleComponents.length === 0 ? (
      <div className="text-center py-4">
        {searchTerm || selectedCategory !== 'All' 
          ? 'No components match your search criteria' 
          : 'No components available in the catalog'}
      </div>
    ) : (
      <div className="max-h-64 overflow-y-auto space-y-2">
        {filteredSampleComponents.map((component) => (
          <div key={`catalog-${component.id}`} className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                    {component.category}
                  </span>
                  <h4 className="font-medium text-gray-800">{component.name}</h4>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {component.brand} • ₹{(component.price || 0).toLocaleString('en-IN')}
                  {component.warranty && <span className="ml-2">• {component.warranty} warranty</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!component.name || !component.price || component.price <= 0) {
                      setError('Cannot add invalid component');
                      return;
                    }
                    addComponent(component);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
                <button
                  onClick={() => handleEditFromCatalog(component)}
                  className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => component.id && handleDeleteFromCatalog(component.id)}
                  className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

    </div>
  );
}