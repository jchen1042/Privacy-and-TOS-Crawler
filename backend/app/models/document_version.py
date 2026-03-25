"""Document Version model for historical global tracking"""
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base
import uuid


class DocumentVersion(Base):
    """
    Historical record of a GlobalDocument.
    Stores the state of a document at a specific version number.
    """
    __tablename__ = "document_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # THE BRIDGE: Link to the GlobalDocument, not the user-specific Document
    global_document_id = Column(UUID(as_uuid=True), ForeignKey("global_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Versioning Metadata
    version_number = Column(Integer, nullable=False) # e.g., 1, 2, 3
    raw_text = Column(Text)           # The policy text as it existed then
    text_hash = Column(String(64))    # Unique fingerprint for this specific version
    word_count = Column(Integer)
    
    # AI Analysis (The Value Add)
    # This stores the analysis of THIS specific version.
    analysis_summary = Column(Text)   
    
    # This stores the diff analysis: "What changed from version N-1 to N?"
    change_description = Column(Text) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    global_document = relationship("GlobalDocument", back_populates="versions")

    def __repr__(self):
        return (f"<DocumentVersion(id={self.id}, "
                f"global_doc_id={self.global_document_id}, "
                f"v={self.version_number})>")