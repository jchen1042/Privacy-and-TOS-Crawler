"""Document endpoints"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from uuid import UUID
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.analysis_result import AnalysisResult
from app.models.crawl_session import CrawlSession
from app.schemas.analysis import AnalysisResponse, DocumentAnalysisResponse, SessionAnalysisResponse, DocumentVersionResponse
from app.database.base import get_db
from sqlalchemy.orm import Session, joinedload

router = APIRouter()


@router.get("/{document_id}", response_model=DocumentAnalysisResponse)
async def get_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a document with its analysis by ID
    
    Args:
        document_id: Document ID
        current_user: Authenticated user
        db: Database session
    
    Returns:
        DocumentAnalysisResponse with analysis results
    """
    # Get document (with user isolation)
    document = db.query(Document).options(
        joinedload(Document.global_document)
    ).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )
    
    # Get analysis if available
    analysis = document.analysis
    
    return DocumentAnalysisResponse(
        document_id=document.id,
        url=document.url,
        document_type=document.document_type,
        title=document.title,
        word_count=document.global_document.word_count if document.global_document else 0,
        created_at=document.created_at,
        analysis=AnalysisResponse(
            id=analysis.id,
            document_id=analysis.document_id,
            summary_100_words=analysis.summary_100_words,
            summary_one_sentence=analysis.summary_one_sentence,
            word_frequency=analysis.word_frequency or {},
            measurements=analysis.measurements or {},
            created_at=analysis.created_at
        ) if analysis else None
    )


@router.get("/{document_id}/versions", response_model=List[DocumentVersionResponse])
async def get_document_versions(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all historical versions and change analysis for a specific document.
    This tracks changes at the global level across all users.
    """
    # 1. Fetch the user's document to verify ownership/access
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    
    if not document or not document.global_document_id:
        raise HTTPException(status_code=404, detail="Document not found or not linked to global store")

    # 2. Fetch versions associated with the GlobalDocument
    versions = db.query(DocumentVersion).filter(
        DocumentVersion.global_document_id == document.global_document_id
    ).order_by(DocumentVersion.created_at.desc()).all()
    
    return versions


@router.post("/{document_id}/favorite")
async def add_to_favorites(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add document to user favorites
    
    Note: Favorites functionality is planned for future implementation.
    Currently returns 501 Not Implemented status.
    """
    raise HTTPException(
        status_code=501,
        detail="Favorites service not yet implemented. Phase 2 coming soon!"
    )


@router.delete("/{document_id}/favorite")
async def remove_from_favorites(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove document from user favorites
    
    Note: Favorites functionality is planned for future implementation.
    Currently returns 501 Not Implemented status.
    """
    raise HTTPException(
        status_code=501,
        detail="Favorites service not yet implemented. Phase 2 coming soon!"
    )
