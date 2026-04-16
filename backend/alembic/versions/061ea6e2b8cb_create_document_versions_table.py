"""create_document_versions_table

Revision ID: 061ea6e2b8cb
Revises: 5b8d6e7062dd
Create Date: 2026-03-24 19:24:42.720945
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '061ea6e2b8cb'
down_revision: Union[str, None] = '5b8d6e7062dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    # Only create the table if it doesn't already exist
    if 'document_versions' not in existing_tables:
        op.create_table('document_versions',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('document_id', sa.UUID(), nullable=False),
            sa.Column('raw_text', sa.Text(), nullable=True),
            sa.Column('text_hash', sa.String(length=64), nullable=True),
            sa.Column('word_count', sa.Integer(), nullable=True),
            sa.Column('analysis_summary', sa.Text(), nullable=True),
            sa.Column('change_description', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_document_versions_document_id'), 'document_versions', ['document_id'], unique=False)
    else:
        print("Table 'document_versions' already exists. Skipping.")


def downgrade() -> None:
    op.drop_index(op.f('ix_document_versions_document_id'), table_name='document_versions')
    op.drop_table('document_versions')