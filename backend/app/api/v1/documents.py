"""Document endpoints"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from uuid import UUID
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.analysis_result import AnalysisResult
from app.models.global_document import GlobalDocument
from app.models.global_analysis_result import GlobalAnalysisResult
from app.models.user_favorite import UserFavorite
from app.models.crawl_session import CrawlSession
from app.schemas.analysis import AnalysisResponse, DocumentAnalysisResponse, SessionAnalysisResponse, DocumentVersionResponse
from app.schemas.favorite import FavoriteDocumentResponse, FavoritesListResponse
from app.database.base import get_db
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

router = APIRouter()

@router.get("/favorites", response_model=FavoritesListResponse)
async def get_favorites(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's favorited documents.
    """
    skip = (page - 1) * limit

    favorites_query = db.query(UserFavorite).filter(
        UserFavorite.user_id == current_user.id
    )

    total_favorites = favorites_query.count()
    
    # Fetch favorites with eager loading of global_document and its analysis
    user_favorites = favorites_query.options(
        joinedload(UserFavorite.global_document).joinedload(GlobalDocument.analysis)
    ).order_by(UserFavorite.created_at.desc()).offset(skip).limit(limit).all()

    response_documents = []
    for fav in user_favorites:
        global_doc = fav.global_document
        if not global_doc:
            # This should ideally not happen if CASCADE delete is set up correctly
            # but good to handle defensively
            continue

        # GlobalAnalysisResult has unique=True on global_document_id, so it's a list of 0 or 1
        global_analysis = global_doc.analysis[0] if global_doc.analysis else None

        # Find the user's document entry to get the session reference
        user_doc = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.global_document_id == global_doc.id
        ).order_by(Document.created_at.desc()).first()

        # Check if there is a newer version available since the user last favorited/viewed it
        is_updated = False
        if global_doc.version and fav.last_viewed_version and global_doc.version > fav.last_viewed_version:
            is_updated = True

        response_documents.append(
            FavoriteDocumentResponse(
                id=fav.id,
                global_document_id=global_doc.id,
                document_id=user_doc.id if user_doc else None,
                session_id=user_doc.session_id if user_doc else None,
                url=global_doc.document_url,
                title=global_doc.title,
                summary=global_analysis.summary_one_sentence if global_analysis else None,
                description=global_analysis.summary_100_words if global_analysis else None,
                document_type=global_doc.document_type,
                created_at=fav.created_at,
                is_updated=is_updated 
            )
        )
    
    return FavoritesListResponse(
        documents=response_documents,
        total=total_favorites,
        page=page,
        limit=limit,
        pages=(total_favorites + limit - 1) // limit if limit > 0 else 0
    )

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
    
    # Update last_viewed_version if this document is favorited by the user
    if document.global_document_id:
        favorite = db.query(UserFavorite).filter(
            UserFavorite.user_id == current_user.id,
            UserFavorite.global_document_id == document.global_document_id
        ).first()
        
        if favorite and document.global_document and document.global_document.version > favorite.last_viewed_version:
            favorite.last_viewed_version = document.global_document.version
            db.commit()

    # Get global analysis for nutrition label
    global_analysis = document.global_document.analysis[0] if document.global_document and document.global_document.analysis else None

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
            nutrition_label=global_analysis.nutrition_label if global_analysis else {},
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
    # Find the user's specific document
    user_document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not user_document:
        raise HTTPException(status_code=404, detail="User document not found")
    
    if not user_document.global_document_id:
        raise HTTPException(status_code=400, detail="Document is not linked to a global document and cannot be favorited.")

    # Check if it's already favorited
    existing_favorite = db.query(UserFavorite).filter(
        UserFavorite.user_id == current_user.id,
        UserFavorite.global_document_id == user_document.global_document_id
    ).first()

    if existing_favorite:
        return {"success": True, "message": "Document already in favorites", "favorite_id": existing_favorite.id}

    # Create new favorite entry
    try:
        new_favorite = UserFavorite(
            user_id=current_user.id,
            global_document_id=user_document.global_document_id
        )
        db.add(new_favorite)
        db.commit()
        db.refresh(new_favorite)
        return {"success": True, "message": "Document added to favorites", "favorite_id": new_favorite.id}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Document already in favorites (concurrent request)")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add to favorites: {str(e)}")


@router.delete("/{document_id}/favorite")
async def remove_from_favorites(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove document from user favorites
    """
    # Find the user's specific document to get the global reference
    user_document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not user_document:
        raise HTTPException(status_code=404, detail="User document not found")

    # Find the favorite entry linking this user to that global document
    favorite_entry = db.query(UserFavorite).filter(
        UserFavorite.user_id == current_user.id,
        UserFavorite.global_document_id == user_document.global_document_id
    ).first()

    if not favorite_entry:
        return {"success": True, "message": "Document was not in favorites"}

    # Delete the favorite entry
    try:
        db.delete(favorite_entry)
        db.commit()
        return {"success": True, "message": "Document removed from favorites"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to remove from favorites: {str(e)}")
