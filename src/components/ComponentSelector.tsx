import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Package, Trash2, Edit3, ExternalLink, Globe } from 'lucide-react';
import { Component } from '../types';
import ProductSearch from './ProductSearch';

interface ComponentSelectorProps {
  components: Component[];
  onChange: (components: Component[]) => void;
}

const API_BASE = 'http://localhost:5001/api';

export default function ComponentSelector({ components, onChange }: ComponentSelectorProps) {
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

  const categories = ['All', 'CPU', 'GPU', 'RAM', 'Motherboard', 'Storage', 'PSU', 'Case', 'Cooling', 'Monitor', 'Accessories', 'Other'];

  useEffect(() => {
    const fetchComponents = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/components`);
        if (!response.ok) throw new Error('Failed to fetch components');
        const data = await response.json();
        setBackendComponents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch components');
      } finally {
        setLoading(false);
      }
    };
    fetchComponents();
  }, []);

  const detectCategory = (title: string) => {
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
  return (Array.isArray(backendComponents) ? backendComponents : []).filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || component.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
}, [searchTerm, selectedCategory, backendComponents]);

  const addComponent = (componentData: Component) => {
    const newComponent: Component = {
      ...componentData,
      id: Date.now().toString(),
      quantity: 1,
      category: componentData.category || detectCategory(componentData.name)
    };
    onChange([...components, newComponent]);
  };

  const handleEdit = (component: Component) => {
    setEditingComponentId(component.id);
    setEditBuffer({
      name: component.name,
      price: component.price.toString(),
      quantity: component.quantity.toString()
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
  };

  const removeComponent = (id: string) => {
    onChange(components.filter(comp => comp.id !== id));
  };

  const calculateComponentTotal = (component: Component) => {
    return component.price * component.quantity;
  };

const handleAddOrUpdateComponent = async () => {
  try {
    setLoading(true);
    setError('');

    // Validate required fields
    if (!newComponent.name || !newComponent.brand || !newComponent.price) {
      throw new Error('Name, brand, and price are required');
    }

    let response;
    const url = editingCatalogComponentId 
      ? `${API_BASE}/components/${editingCatalogComponentId}`
      : `${API_BASE}/components`;

    const method = editingCatalogComponentId ? 'PUT' : 'POST';
    
    response = await fetch(url, {
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

    if (editingCatalogComponentId) {
      setBackendComponents(backendComponents.map(comp => 
        comp.id === editingCatalogComponentId ? savedComponent : comp
      ));
    } else {
      const componentWithQuantity = {
        ...savedComponent,
        quantity: 1,
        category: savedComponent.category || detectCategory(savedComponent.name)
      };
      onChange([...components, componentWithQuantity]);
      setBackendComponents([...backendComponents, savedComponent]);
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
      price: component.price,
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
      
      setBackendComponents(backendComponents.filter(comp => comp.id !== componentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete component');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          Error: {error}
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
        <div className="flex gap-2">
          <button
            onClick={() => setShowLiveSearch(!showLiveSearch)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Globe className="w-4 h-4" />
            Live Search
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Browse Catalog
          </button>
          <button
            onClick={() => {
              setEditingCatalogComponentId(null);
              setShowManualForm(!showManualForm);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Custom Component
          </button>
        </div>
      </div>

      {/* Selected Components */}
      {components.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Selected Components</h3>
          <div className="space-y-3">
            {components.map((component) => (
              <div key={component.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
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
                        {component.brand} • ₹{component.price.toLocaleString('en-IN')} × {component.quantity} = ₹{calculateComponentTotal(component).toLocaleString('en-IN')}
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
              const newComponent: Component = {
                ...componentData,
                id: Date.now().toString(),
                quantity: 1,
                category: componentData.category || detectCategory(componentData.name)
              };
              onChange([...components, newComponent]);
            }} 
            apiBaseUrl={API_BASE}
          />
        </div>
      )}
      console.log('showLiveSearch:', showLiveSearch);


      {/* Component Form (Add/Edit) */}
      {showManualForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {editingCatalogComponentId ? 'Edit Component' : 'Add Custom Component'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={newComponent.category}
                onChange={(e) => setNewComponent({...newComponent, category: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {categories.filter(c => c !== 'All').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newComponent.name}
                onChange={(e) => setNewComponent({...newComponent, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. AMD Ryzen 5 5600X"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                type="text"
                value={newComponent.brand}
                onChange={(e) => setNewComponent({...newComponent, brand: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. AMD"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input
                type="number"
                value={newComponent.price}
                onChange={(e) => setNewComponent({...newComponent, price: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 15999"
              />
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
              onClick={handleAddOrUpdateComponent}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              {editingCatalogComponentId ? 'Update Component' : 'Add Component'}
            </button>
            <button
              onClick={() => {
                setShowManualForm(false);
                setEditingCatalogComponentId(null);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Component Catalog */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Browse Component Catalog</h3>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
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
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredSampleComponents.map((component) => (
              <div key={component.id} className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                        {component.category}
                      </span>
                      <h4 className="font-medium text-gray-800">{component.name}</h4>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {component.brand} • ₹{component.price.toLocaleString('en-IN')}
                      {component.warranty && <span className="ml-2">• {component.warranty} warranty</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addComponent(component)}
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
                      onClick={() => handleDeleteFromCatalog(component.id)}
                      className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}