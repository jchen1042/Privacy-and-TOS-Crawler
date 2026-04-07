from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List


class FavoriteDocumentResponse(BaseModel):
    """Schema for a single favorited document returned to the frontend."""
    id: UUID  # UserFavorite ID
    global_document_id: UUID  # The ID of the global document
    document_id: Optional[UUID] = None # The user-specific document pointer
    session_id: Optional[UUID] = None  # The session it was found in
    url: str
    title: Optional[str] = None
    summary: Optional[str] = None  # Typically summary_one_sentence
    description: Optional[str] = None  # Typically summary_100_words
    document_type: Optional[str] = None
    created_at: datetime  # When it was favorited

    class Config:
        from_attributes = True


class FavoritesListResponse(BaseModel):
    """Schema for listing favorited documents with pagination metadata."""
    documents: List[FavoriteDocumentResponse]
    total: int
    page: int
    limit: int
    pages: int

    class Config:
        from_attributes = True