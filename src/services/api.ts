const API_BASE = 'http://localhost:5000/api';

export const fetchComponents = async () => {
  const response = await fetch(`${API_BASE}/components`);
  if (!response.ok) {
    throw new Error('Failed to fetch components');
  }
  return response.json();
};

export const saveQuotation = async (data: {
  pdfData: string;
  customerName: string;
  phone: string;
  quotationNumber: string;
}) => {
  const response = await api.post('/quotations', data);
  return response.data;
};

export const getQuotations = async () => {
  const response = await api.get('/quotations');
  return response.data.quotations;
};

export const getQuotationPdf = async (id: string) => {
  const response = await api.get(`/quotations/${id}`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data);
};

export const deleteQuotation = async (id: string) => {
  const response = await api.delete(`/quotations/${id}`);
  return response.data;
};

export const addComponent = async (component: Omit<Component, 'id'>) => {
  const response = await fetch(`${API_BASE}/components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(component),
  });
  if (!response.ok) {
    throw new Error('Failed to add component');
  }
  return response.json();
};

export const updateComponent = async (id: string, component: Partial<Component>) => {
  const response = await fetch(`${API_BASE}/components/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(component),
  });
  if (!response.ok) {
    throw new Error('Failed to update component');
  }
  return response.json();
};

export const deleteComponent = async (id: string) => {
  const response = await fetch(`${API_BASE}/components/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete component');
  }
  return response.json();
};