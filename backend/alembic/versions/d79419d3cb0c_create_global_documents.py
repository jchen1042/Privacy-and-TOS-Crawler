"""Create global_documents table
Revision ID: d79419d3cb0c
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

revision: str = 'd79419d3cb0c'
down_revision: Union[str, None] = '1ae71128499e'

def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    if 'global_documents' not in inspector.get_table_names():
        op.create_table(
            'global_documents',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('base_url', sa.String(length=2048), nullable=False),
            sa.Column('document_url', sa.String(length=2048), nullable=False),
            sa.Column('document_type', sa.String(length=50), nullable=False),
            sa.Column('title', sa.String(length=500), nullable=True),
            sa.Column('raw_text', sa.Text(), nullable=True),
            sa.Column('text_hash', sa.String(length=64), nullable=False),
            sa.Column('word_count', sa.Integer(), nullable=True),
            sa.Column('last_crawled', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('crawl_status', sa.String(length=20), server_default='fresh', nullable=True),
            sa.Column('version', sa.Integer(), server_default='1', nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index('idx_global_docs_url_type', 'global_documents', ['document_url', 'document_type'])
        op.create_index('idx_global_docs_base_url', 'global_documents', ['base_url', 'last_crawled'])
        op.create_index('idx_global_docs_hash', 'global_documents', ['text_hash'])
        op.create_index('idx_global_docs_base_url_col', 'global_documents', ['base_url'])
    else:
        print("Table 'global_documents' already exists. Skipping.")

def downgrade() -> None:
    op.drop_table('global_documents')