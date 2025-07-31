import axios from 'axios';

export interface ProductData {
  name: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  seller: 'amazon' | 'flipkart' | 'mdcomputers';
  productUrl: string;
  lastUpdated: Date;
}

export const priceService = {
  searchProducts: async (query: string, category?: string): Promise<{ products: ProductData[] }> => {
    try {
      const response = await axios.get(`http://localhost:5001/api/search`, {
        params: { query }
      });

      // Transform server response if needed
      const products = response.data.map((item: any) => ({
        name: item.title,
        price: parseInt(item.price.replace(/[₹,]/g, '')),
        originalPrice: undefined,
        rating: undefined,
        seller: item.site.toLowerCase(),
        productUrl: item.link,
        lastUpdated: new Date()
      }));

      return { products };
    } catch (error) {
      console.error('API error:', error);
      return { products: [] };
    }
  }
};
