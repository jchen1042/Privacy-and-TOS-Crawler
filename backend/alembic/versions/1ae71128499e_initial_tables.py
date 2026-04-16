"""Initial tables
Revision ID: 1ae71128499e
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

revision: str = '1ae71128499e'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    # USERS
    if 'users' not in existing_tables:
        op.create_table('users',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('firebase_uid', sa.String(length=128), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('username', sa.String(length=100), nullable=True),
            sa.Column('display_name', sa.String(length=255), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_users_firebase_uid'), 'users', ['firebase_uid'], unique=True)

    # CRAWL_SESSIONS
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

    # DOCUMENTS 
    if 'documents' not in existing_tables:
        op.create_table('documents',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('session_id', sa.UUID(), nullable=True),
            sa.Column('url', sa.String(length=2048), nullable=False),
            sa.Column('document_type', sa.String(length=50), nullable=True),
            sa.Column('title', sa.String(length=500), nullable=True),
            sa.Column('raw_text', sa.Text(), nullable=True),
            sa.Column('text_hash', sa.String(length=64), nullable=True),
            sa.Column('word_count', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['session_id'], ['crawl_sessions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

    # ANALYSIS_RESULTS
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

    # USER_FAVORITES
    if 'user_favorites' not in existing_tables:
        op.create_table('user_favorites',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('document_id', sa.UUID(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

def downgrade() -> None:
    # Standard downgrade logic
    op.drop_table('user_favorites')
    op.drop_table('analysis_results')
    op.drop_table('documents')
    op.drop_table('crawl_sessions')
    op.drop_table('users')