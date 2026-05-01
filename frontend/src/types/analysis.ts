export interface NutritionLabelData {
  opt_out_available?: string;
  data_sharing?: string;
  data_retention?: string;
  can_user_request_deletion?: string;
  third_party_sharing?: string;
  data_broker_sharing?: string;
  cross_device_tracking?: string;
  collection_purpose?: string;
  microphone_access?: string;
  camera_access?: string;
  local_storage_access?: string;
  user_contacts_access?: string;
  location_access?: string;
  biometric_data_access?: string;
  health_data_access?: string;
  data_transmission_frequency?: string;
  account_deletion_allowed?: string;
  internet_required?: string;
  includes_reccurring_charges?: string;
  [key: string]: string | undefined;
}

export interface AnalysisResult {
  document_id: string
  summary_100: string
  summary_sentence: string
  word_frequency: Record<string, number>
  measurements: TextMiningMeasurements
  nutrition_label?: NutritionLabelData
  created_at: string
}

export interface TextMiningMeasurements {
  word_count: number
  sentence_count: number
  avg_words_per_sentence: number
  flesch_reading_ease: number
  flesch_kincaid_grade: number
  automated_readability_index: number
  sentiment_score: number
  keyword_density: number
  legal_clause_count: number
  risk_indicator_score: number
}

export interface AnalysisResponse {
  success: boolean
  data: AnalysisResult
  message?: string
}

export interface WordFrequencyItem {
  word: string
  count: number
  percentage: number
}

export interface RiskIndicator {
  level: 'low' | 'medium' | 'high'
  score: number
  description: string
  factors: string[]
}

export interface LegalClause {
  type: string
  content: string
  risk_level: 'low' | 'medium' | 'high'
  start_position: number
  end_position: number
}

export interface SentimentAnalysis {
  score: number
  magnitude: number
  label: 'positive' | 'negative' | 'neutral'
  confidence: number
}

export interface ReadabilityScores {
  flesch_reading_ease: number
  flesch_kincaid_grade: number
  automated_readability_index: number
  coleman_liau_index: number
  smog_index: number
  average_grade_level: number
}
