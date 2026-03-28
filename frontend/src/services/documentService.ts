import axios from 'axios';
import { DocumentVersion } from '../types/history';
import { getAuth } from 'firebase/auth';

// Assuming standard API configuration
const API_BASE_URL = "https://privacy-and-tos-crawler-backend.onrender.com/api/v1";

export const documentService = {
  getDocumentHistory: async (documentId: string): Promise<DocumentVersion[]> => {
    const auth = getAuth();
    
    // Ensure auth is initialized and user is present
    if (!auth.currentUser) {
      throw new Error("Authentication required to fetch history");
    }

    const token = await auth.currentUser.getIdToken();

    const response = await axios.get<DocumentVersion[]>(
      `${API_BASE_URL}/documents/${documentId}/versions`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  },
};