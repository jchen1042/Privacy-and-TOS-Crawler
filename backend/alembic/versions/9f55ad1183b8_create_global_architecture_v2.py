"""create_global_architecture_v2
Revision ID: 9f55ad1183b8
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '9f55ad1183b8'
down_revision: Union[str, None] = '24d095296162'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'document_versions' in existing_tables:
        columns = [c['name'] for c in inspector.get_columns('document_versions')]
        if 'document_id' in columns and 'global_document_id' not in columns:
            print("Detected legacy 'document_versions' table. Dropping to rebuild for v2.")
            op.drop_table('document_versions')
            existing_tables.remove('document_versions')
            
    if 'document_versions' not in existing_tables:
        op.create_table('document_versions',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('global_document_id', sa.UUID(), nullable=False),
            sa.Column('version_number', sa.Integer(), nullable=False),
            sa.Column('raw_text', sa.Text(), nullable=True),
            sa.Column('text_hash', sa.String(length=64), nullable=True),
            sa.Column('word_count', sa.Integer(), nullable=True),
            sa.Column('analysis_summary', sa.Text(), nullable=True),
            sa.Column('change_description', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['global_document_id'], ['global_documents.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_document_versions_global_document_id'), 'document_versions', ['global_document_id'], unique=False)
    else:
        print("Table 'document_versions' (v2) already exists. Skipping.")


def downgrade() -> None:
    op.drop_index(op.f('ix_document_versions_global_document_id'), table_name='document_versions')
    op.drop_table('document_versions')