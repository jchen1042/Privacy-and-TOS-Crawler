"""Global document model for shared document cache"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base
import uuid


class GlobalDocument(Base):
    """
    Global document cache - shared across all users.
    Acts as the 'Source of Truth' for a specific URL.
    """
    __tablename__ = "global_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    base_url = Column(String(2048), nullable=False, index=True)  # e.g., "https://walmart.com"
    document_url = Column(String(2048), nullable=False, index=True, unique=True) # Ensure one record per unique URL
    document_type = Column(String(50), nullable=False)  # privacy_policy, terms_of_service
    title = Column(String(500))
    
    # Current state
    raw_text = Column(Text)  # Latest version's text
    text_hash = Column(String(64), nullable=False, index=True) 
    word_count = Column(Integer)
    
    # Caching metadata
    last_crawled = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    crawl_status = Column(String(20), default='fresh')  # 'fresh', 'stale', 'failed'
    version = Column(Integer, default=1)  # Increments every time text_hash changes
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # --- Relationships ---
    
    # Link back to user-specific pointers
    user_documents = relationship("Document", back_populates="global_document")
    
    # Link to the historical timeline of this specific URL
    versions = relationship(
        "DocumentVersion", 
        back_populates="global_document", 
        cascade="all, delete-orphan",
        order_by="desc(DocumentVersion.version_number)" # Always get newest first
    )
    
    # --- Indexes for performance ---
    __table_args__ = (
        Index('idx_global_docs_url_type', 'document_url', 'document_type'),
        Index('idx_global_docs_base_url', 'base_url', 'last_crawled'),
    )

    def __repr__(self):
        return f"<GlobalDocument(id={self.id}, url={self.document_url}, version={self.version})>"