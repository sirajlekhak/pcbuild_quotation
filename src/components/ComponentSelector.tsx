import React, { useState, useMemo } from 'react';
import { Plus, Search, Package, Trash2, Edit3, ExternalLink, Globe } from 'lucide-react';
import { Component } from '../types';
import { sampleComponents } from '../data/components';
import ProductSearch from './ProductSearch';

interface ComponentSelectorProps {
  components: Component[];
  onChange: (components: Component[]) => void;
}

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
  const [showLiveSearch, setShowLiveSearch] = useState(false);

  const categories = ['All', 'CPU', 'GPU', 'RAM', 'Motherboard', 'Storage', 'PSU', 'Case', 'Cooling', 'Monitor', 'Accessories', 'Other'];

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

  const addComponentFromSearch = (componentData: Omit<Component, 'id' | 'quantity'>) => {
    const newComponent: Component = {
      ...componentData,
      id: Date.now().toString(),
      quantity: 1,
      category: detectCategory(componentData.name)
    };
    onChange([...components, newComponent]);
  };

  const filteredSampleComponents = useMemo(() => {
    return sampleComponents.filter(component => {
      const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        component.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || component.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const addComponent = (sampleComponent: typeof sampleComponents[0]) => {
    const newComponent: Component = {
      ...sampleComponent,
      id: Date.now().toString(),
      quantity: 1,
      category: detectCategory(sampleComponent.name)
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

  const handleCancel = () => {
    setEditingComponentId(null);
  };

  const removeComponent = (id: string) => {
    onChange(components.filter(comp => comp.id !== id));
  };

  const calculateComponentTotal = (component: Component) => {
    return component.price * component.quantity;
  };


  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
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
                        onClick={handleCancel}
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
          <ProductSearch onAddComponent={addComponentFromSearch} />
        </div>
      )}

      {/* Add Component Form */}
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
            {filteredSampleComponents.map((component, index) => (
              <div key={index} className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between">
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
                <button
                  onClick={() => addComponent(component)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
            ))}
            {filteredSampleComponents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No components found matching your search criteria.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}