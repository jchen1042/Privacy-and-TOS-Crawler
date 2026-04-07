"""Document model - User-specific pointer to Global Documents"""
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base
import uuid


class Document(Base):
    """
    User-specific Document entry.
    Acts as a 'Library Card' pointing to a GlobalDocument.
    """
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("crawl_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # THE BRIDGE: Link to the Global layer
    global_document_id = Column(UUID(as_uuid=True), ForeignKey("global_documents.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Metadata that can still be user-specific
    url = Column(String(2048), nullable=False)
    document_type = Column(String(50))  # e.g., privacy_policy
    title = Column(String(500))         # The title found during the user's specific crawl
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="documents")
    session = relationship("CrawlSession", back_populates="documents")
    
    # Points to the actual content and global history
    global_document = relationship("GlobalDocument", back_populates="user_documents")
    
    # AnalysisResult can now be linked to the Global version or stayed here 
    # if you want "Per-User" personal notes. Keeping it here for now.
    analysis = relationship("AnalysisResult", back_populates="document", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Document(id={self.id}, user_id={self.user_id}, global_id={self.global_document_id})>"