"""rebuild_global_architecture
Revision ID: 24d095296162
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

revision: str = '24d095296162'
down_revision: Union[str, None] = '061ea6e2b8cb'

def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    # GLOBAL DOCUMENTS 
    if 'global_documents' not in existing_tables:
        op.create_table('global_documents',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('base_url', sa.String(length=2048), nullable=False),
            sa.Column('document_url', sa.String(length=2048), nullable=False),
            sa.Column('document_type', sa.String(length=50), nullable=False),
            sa.Column('title', sa.String(length=500), nullable=True),
            sa.Column('raw_text', sa.Text(), nullable=True),
            sa.Column('text_hash', sa.String(length=64), nullable=False),
            sa.Column('word_count', sa.Integer(), nullable=True),
            sa.Column('last_crawled', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('crawl_status', sa.String(length=20), nullable=True),
            sa.Column('version', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('idx_global_docs_base_url', 'global_documents', ['base_url', 'last_crawled'], unique=False)
        op.create_index('idx_global_docs_url_type', 'global_documents', ['document_url', 'document_type'], unique=False)
        op.create_index(op.f('ix_global_documents_base_url'), 'global_documents', ['base_url'], unique=False)
        op.create_index(op.f('ix_global_documents_document_url'), 'global_documents', ['document_url'], unique=True)
        op.create_index(op.f('ix_global_documents_last_crawled'), 'global_documents', ['last_crawled'], unique=False)
        op.create_index(op.f('ix_global_documents_text_hash'), 'global_documents', ['text_hash'], unique=False)

    # CRAWL SESSIONS 
    if 'crawl_sessions' not in existing_tables:
        op.create_table('crawl_sessions',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('url', sa.String(length=2048), nullable=False),
            sa.Column('status', sa.Enum('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', name='sessionstatus'), nullable=False),
            sa.Column('document_count', sa.Integer(), nullable=True),
            sa.Column('analyzed_count', sa.Integer(), nullable=True),
            sa.Column('error_message', sa.String(length=1000), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_crawl_sessions_created_at'), 'crawl_sessions', ['created_at'], unique=False)
        op.create_index(op.f('ix_crawl_sessions_status'), 'crawl_sessions', ['status'], unique=False)
        op.create_index(op.f('ix_crawl_sessions_user_id'), 'crawl_sessions', ['user_id'], unique=False)

    # GLOBAL ANALYSIS RESULTS 
    if 'global_analysis_results' not in existing_tables:
        op.create_table('global_analysis_results',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('global_document_id', sa.UUID(), nullable=False),
            sa.Column('document_url', sa.String(length=2048), nullable=False),
            sa.Column('text_hash', sa.String(length=64), nullable=False),
            sa.Column('summary_100_words', sa.Text(), nullable=True),
            sa.Column('summary_one_sentence', sa.String(length=500), nullable=True),
            sa.Column('word_frequency', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('measurements', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('analysis_model', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['global_document_id'], ['global_documents.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('idx_global_analysis_hash', 'global_analysis_results', ['text_hash'], unique=False)
        op.create_index('idx_global_analysis_url_hash', 'global_analysis_results', ['document_url', 'text_hash'], unique=False)
        op.create_index(op.f('ix_global_analysis_results_document_url'), 'global_analysis_results', ['document_url'], unique=False)
        op.create_index(op.f('ix_global_analysis_results_global_document_id'), 'global_analysis_results', ['global_document_id'], unique=True)
        op.create_index(op.f('ix_global_analysis_results_text_hash'), 'global_analysis_results', ['text_hash'], unique=False)

    # DOCUMENTS 
    if 'documents' not in existing_tables:
        op.create_table('documents',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('session_id', sa.UUID(), nullable=True),
            sa.Column('global_document_id', sa.UUID(), nullable=True),
            sa.Column('url', sa.String(length=2048), nullable=False),
            sa.Column('document_type', sa.String(length=50), nullable=True),
            sa.Column('title', sa.String(length=500), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['global_document_id'], ['global_documents.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['session_id'], ['crawl_sessions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_documents_global_document_id'), 'documents', ['global_document_id'], unique=False)
        op.create_index(op.f('ix_documents_session_id'), 'documents', ['session_id'], unique=False)
        op.create_index(op.f('ix_documents_user_id'), 'documents', ['user_id'], unique=False)
    else:
        doc_columns = [c['name'] for c in inspector.get_columns('documents')]
        if 'global_document_id' not in doc_columns:
            op.add_column('documents', sa.Column('global_document_id', sa.UUID(), nullable=True))
            op.create_foreign_key('fk_documents_global_document_id', 'documents', 'global_documents', ['global_document_id'], ['id'], ondelete='SET NULL')
            op.create_index(op.f('ix_documents_global_document_id'), 'documents', ['global_document_id'], unique=False)
            print("Self-healed 'documents' table by adding 'global_document_id'.")

    # ANALYSIS RESULTS
    if 'analysis_results' not in existing_tables:
        op.create_table('analysis_results',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('document_id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('summary_100_words', sa.Text(), nullable=True),
            sa.Column('summary_one_sentence', sa.String(length=500), nullable=True),
            sa.Column('word_frequency', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('measurements', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_analysis_results_document_id'), 'analysis_results', ['document_id'], unique=True)
        op.create_index(op.f('ix_analysis_results_user_id'), 'analysis_results', ['user_id'], unique=False)

    if 'user_favorites' in existing_tables:
        # Check if the foreign key already exists to avoid DuplicateObject errors
        fks = inspector.get_foreign_keys('user_favorites')
        if not any(fk['referred_table'] == 'documents' for fk in fks):
            op.create_foreign_key('fk_user_favorites_documents', 'user_favorites', 'documents', ['document_id'], ['id'], ondelete='CASCADE')

def downgrade() -> None:
    pass