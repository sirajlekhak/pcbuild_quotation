export interface Component {
  id: string;
  category: 'CPU' | 'GPU' | 'RAM' | 'Motherboard' | 'Storage' | 'PSU' | 'Case' | 'Cooling' | 'Other';
  name: string;
  brand: string;
  model: string;
  price: number;
  quantity: number;
  link?: string;
  warranty?: string;
}

export interface Customer {
  name: string;
  phone: string;
  email: string;
  address?: string;
}

export interface Quotation {
  id: string;
  customer: Customer;
  components: Component[];
  gstRate: number;
  discountRate: number;
  notes: string;
  createdAt: Date;
  validUntil: Date;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  website?: string;
}