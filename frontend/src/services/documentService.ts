import { DocumentVersion } from '../types/history';
import { apiService } from './api';

export const documentService = {
  getDocumentHistory: async (documentId: string): Promise<DocumentVersion[]> => {
    const response = await apiService.getDocumentVersions(documentId);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || "Failed to fetch history");
  },

  getDocument: async (documentId: string): Promise<any> => {
    const response = await apiService.getDocument(documentId);
    if (response.success && response.data) {
      // apiService returns DocumentResponse, we unwrap the inner 'data' for the component
      return response.data;
    }
    throw new Error(response.error?.message || "Failed to fetch document info");
  },
};