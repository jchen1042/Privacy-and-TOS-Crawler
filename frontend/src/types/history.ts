export interface DocumentVersion {
  id: string;
  global_document_id: string;
  created_at: string;
  raw_text?: string;
  text_hash: string;
  word_count: number;
  change_description?: string; // The AI-generated description of what changed
  analysis_summary?: string;    // The AI-generated summary of this specific version
  version_number?: number;
}