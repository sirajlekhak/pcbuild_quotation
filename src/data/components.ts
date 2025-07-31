import { Component } from '../types';

export const sampleComponents: Omit<Component, 'id' | 'quantity'>[] = [
  // CPUs
  { category: 'CPU', name: 'AMD Ryzen 5 5600X', brand: 'AMD', model: '5600X', price: 15999, warranty: '3 years' },
  { category: 'CPU', name: 'Intel Core i5-12400F', brand: 'Intel', model: 'i5-12400F', price: 14999, warranty: '3 years' },
  { category: 'CPU', name: 'AMD Ryzen 7 5700X', brand: 'AMD', model: '5700X', price: 22999, warranty: '3 years' },
  { category: 'CPU', name: 'Intel Core i7-12700F', brand: 'Intel', model: 'i7-12700F', price: 28999, warranty: '3 years' },
  
  // GPUs
  { category: 'GPU', name: 'NVIDIA RTX 4060', brand: 'NVIDIA', model: 'RTX 4060', price: 32999, warranty: '3 years' },
  { category: 'GPU', name: 'AMD RX 6600 XT', brand: 'AMD', model: 'RX 6600 XT', price: 28999, warranty: '2 years' },
  { category: 'GPU', name: 'NVIDIA RTX 4070', brand: 'NVIDIA', model: 'RTX 4070', price: 54999, warranty: '3 years' },
  { category: 'GPU', name: 'AMD RX 7700 XT', brand: 'AMD', model: 'RX 7700 XT', price: 42999, warranty: '2 years' },
  
  // RAM
  { category: 'RAM', name: 'Corsair Vengeance LPX 16GB DDR4', brand: 'Corsair', model: 'LPX 16GB DDR4', price: 4999, warranty: 'Lifetime' },
  { category: 'RAM', name: 'G.Skill Ripjaws V 32GB DDR4', brand: 'G.Skill', model: 'Ripjaws V 32GB DDR4', price: 8999, warranty: 'Lifetime' },
  { category: 'RAM', name: 'Kingston Fury Beast 16GB DDR5', brand: 'Kingston', model: 'Fury Beast 16GB DDR5', price: 7999, warranty: 'Lifetime' },
  
  // Motherboards
  { category: 'Motherboard', name: 'MSI B450 TOMAHAWK MAX', brand: 'MSI', model: 'B450 TOMAHAWK MAX', price: 8999, warranty: '3 years' },
  { category: 'Motherboard', name: 'ASUS TUF Gaming B550M-Plus', brand: 'ASUS', model: 'TUF Gaming B550M-Plus', price: 12999, warranty: '3 years' },
  { category: 'Motherboard', name: 'Gigabyte Z690 AORUS Elite', brand: 'Gigabyte', model: 'Z690 AORUS Elite', price: 18999, warranty: '3 years' },
  
  // Storage
  { category: 'Storage', name: 'Samsung 980 1TB NVMe SSD', brand: 'Samsung', model: '980 1TB NVMe', price: 7999, warranty: '5 years' },
  { category: 'Storage', name: 'WD Black SN770 500GB NVMe', brand: 'Western Digital', model: 'Black SN770 500GB', price: 4999, warranty: '5 years' },
  { category: 'Storage', name: 'Seagate Barracuda 2TB HDD', brand: 'Seagate', model: 'Barracuda 2TB', price: 4599, warranty: '2 years' },
  
  // PSU
  { category: 'PSU', name: 'Corsair CV650 650W 80+ Bronze', brand: 'Corsair', model: 'CV650 650W', price: 5999, warranty: '3 years' },
  { category: 'PSU', name: 'Seasonic Focus GX-750 750W 80+ Gold', brand: 'Seasonic', model: 'Focus GX-750', price: 9999, warranty: '10 years' },
  { category: 'PSU', name: 'Cooler Master MWE Gold 650W', brand: 'Cooler Master', model: 'MWE Gold 650W', price: 7999, warranty: '5 years' },
  
  // Cases
  { category: 'Case', name: 'NZXT H510 Mid Tower', brand: 'NZXT', model: 'H510', price: 6999, warranty: '2 years' },
  { category: 'Case', name: 'Corsair 4000D Airflow', brand: 'Corsair', model: '4000D Airflow', price: 8999, warranty: '2 years' },
  { category: 'Case', name: 'Fractal Design Core 1000', brand: 'Fractal Design', model: 'Core 1000', price: 4999, warranty: '2 years' },
  
  // Cooling
  { category: 'Cooling', name: 'Cooler Master Hyper 212', brand: 'Cooler Master', model: 'Hyper 212', price: 2999, warranty: '2 years' },
  { category: 'Cooling', name: 'Noctua NH-D15', brand: 'Noctua', model: 'NH-D15', price: 8999, warranty: '6 years' },
  { category: 'Cooling', name: 'Corsair H100i RGB Platinum', brand: 'Corsair', model: 'H100i RGB Platinum', price: 12999, warranty: '5 years' }
];