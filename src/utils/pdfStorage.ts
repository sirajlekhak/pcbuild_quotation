// src/utils/pdfStorage.ts
import { loadPDFInfo } from '@/utils/pdfStorage';


export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// src/utils/pdfStorage.ts
interface PDFInfo {
  id: string;
  date: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  components: {
    name: string;
    brand: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  notes: string;
  pdfData: string;
  type: 'quotation' | 'invoice';
}

export const savePDFInfo = async (data: PDFInfo): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:5001/api/save_pdf_info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data),
      credentials: 'include'  // If you need to handle cookies/sessions
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error saving PDF info:', error);
    return false;
  }
};

export const loadPDFInfo = async (): Promise<PDFInfo[]> => {
  try {
    const response = await fetch('http://localhost:5001/api/load_pdf_info');
    const data = await response.json();

    return (Array.isArray(data) ? data : []).map(item => ({
      ...item,
      id: item.id || uuidv4(), // Backfill missing IDs
      components: (item.components || []).map((c: any) => ({
        ...c,
        id: c.id || uuidv4()
      }))
    }));
  } catch (error) {
    console.error('Error loading PDF info:', error);
    return [];
  }
};

export const createNewPDFInfo = (): PDFInfo => ({
  id: uuidv4(),
  date: new Date().toISOString(),
  customer: { name: '', phone: '' },
  components: [],
  subtotal: 0,
  discountRate: 0,
  discountAmount: 0,
  gstRate: 0,
  gstAmount: 0,
  totalAmount: 0,
  notes: '',
  pdfData: '',
  type: 'quotation'
});