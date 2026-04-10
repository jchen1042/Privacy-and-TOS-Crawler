"""Analysis result schemas"""
from pydantic import BaseModel, Field, model_validator, ConfigDict, AliasChoices
from typing import Dict, List, Any, Optional, Union
from uuid import UUID, uuid4
from datetime import datetime


class NutritionLabelSchema(BaseModel):
    """Schema for Digital Nutrition Label data"""
    #opt_out_available: str = "TEST"
    #data_sharing: str = "Not Specified"
    #data_retention: str = "Not Specified"
    #can_user_request_deletion: str = "Not Specified"
    #third_party_sharing: str = "Not Specified"
    #data_broker_sharing: str = "Not Specified"
    #cross_device_tracking: str = "Not Specified"
    #collection_purpose: str = "Not Specified"
    #microphone_access: str = "Not Specified"
    #camera_access: str = "Not Specified"

    opt_out_available: Optional[Any] = None
    data_sharing: Optional[Any] = None
    data_retention: Optional[Any] = None
    can_user_request_deletion: Optional[Any] = None
    third_party_sharing: Optional[Any] = None
    data_broker_sharing: Optional[Any] = None
    cross_device_tracking: Optional[Any] = None
    collection_purpose: Optional[Any] = None
    microphone_access: Optional[Any] = None
    camera_access: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class WordFrequencyItem(BaseModel):
    """Word frequency item"""
    word: str
    count: int


class TextMeasurements(BaseModel):
    """Text mining measurements"""
    word_count: int = 0
    sentence_count: int = 0
    average_words_per_sentence: float = 0.0
    flesch_reading_ease: float = 0.0
    flesch_kincaid_grade: float = 0.0
    automated_readability_index: float = 0.0
    sentiment_score: float = 0.0  # -1 to 1
    keyword_density: float = 0.0  # percentage
    legal_clause_count: int = 0
    risk_indicator_score: float = 0.0  # 0 to 100


class AnalysisResponse(BaseModel):
    """Analysis result response"""
    id: UUID
    document_id: UUID = Field(validation_alias=AliasChoices('document_id', 'global_document_id'))
    summary_100_words: str
    summary_one_sentence: str
    word_frequency: Dict[str, int] = Field(default_factory=dict)
    measurements: Dict[str, Any] = Field(default_factory=dict)
    # Ensure this is allowed to be initialized from a dict
    nutrition_label: Optional[NutritionLabelSchema] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @model_validator(mode='before')
    @classmethod
    def validate_orm_data(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return data
        
        # Use direct attribute access instead of getattr with a None fallback.
        # This forces SQLAlchemy to load the column if it's currently lazy.
        try:
            raw_label = data.nutrition_label
        except AttributeError:
            raw_label = None

        return {
            "id": data.id,
            "document_id": getattr(data, 'global_document_id', None),
            "summary_100_words": data.summary_100_words,
            "summary_one_sentence": data.summary_one_sentence,
            "word_frequency": data.word_frequency,
            "measurements": data.measurements,
            # If raw_label is still None, we return an empty dict so 
            # Pydantic fills in the "Not Specified" defaults instead of null.
            "nutrition_label": raw_label if raw_label is not None else {}, 
            "created_at": data.created_at
        }


class DocumentAnalysisResponse(BaseModel):
    """Complete document with analysis"""
    document_id: UUID
    url: str
    document_type: str
    title: str | None
    word_count: int
    created_at: datetime
    analysis: AnalysisResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class SessionAnalysisResponse(BaseModel):
    """Crawl session with all documents and analyses"""
    session_id: UUID
    url: str
    status: str
    document_count: int
    analyzed_count: int
    created_at: datetime
    documents: List[DocumentAnalysisResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class DocumentVersionResponse(BaseModel):
    """Document version response schema"""
    id: UUID
    global_document_id: UUID
    version_number: int
    raw_text: str | None = None
    text_hash: str
    word_count: int
    analysis_summary: str | None = None
    change_description: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
