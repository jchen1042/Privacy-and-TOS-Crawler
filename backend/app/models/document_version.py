from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base
import uuid


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    
    raw_text = Column(Text)          # The actual policy text
    text_hash = Column(String(64))   # The unique fingerprint (SHA256)
    word_count = Column(Integer)
    
    # AI Fields
    analysis_summary = Column(Text)  # Standard analysis of this version
    change_description = Column(Text) # AI-generated "What changed since last time?"
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    document = relationship("Document", back_populates="versions")

    def __repr__(self):
        return f"<DocumentVersion(id={self.id}, document_id={self.document_id}, word_count={self.word_count})>"