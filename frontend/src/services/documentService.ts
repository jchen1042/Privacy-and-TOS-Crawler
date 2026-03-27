import axios from 'axios';
import { DocumentVersion } from '../types/history';

// Assuming standard API configuration
const API_BASE_URL = "https://privacy-and-tos-crawler-backend.onrender.com/api/v1";

export const documentService = {
  getDocumentHistory: async (documentId: string): Promise<DocumentVersion[]> => {
    const response = await axios.get<DocumentVersion[]>(
      `${API_BASE_URL}/documents/${documentId}/versions`
    );
    return response.data;
  },
};