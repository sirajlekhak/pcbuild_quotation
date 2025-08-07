import { promises as fs } from 'fs';
import path from 'path';

const PDF_INFO_PATH = path.join(process.cwd(), 'backend/data/pdfinfo.json');

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      // Handle saving PDF info
      const existingData = await loadData();
      existingData.push(req.body);
      await fs.writeFile(PDF_INFO_PATH, JSON.stringify(existingData, null, 2));
      return res.status(200).json({ success: true });
    } else if (req.method === 'GET') {
      // Handle loading PDF info
      const data = await loadData();
      return res.status(200).json(data);
    }
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function loadData() {
  try {
    const data = await fs.readFile(PDF_INFO_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}