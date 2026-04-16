"""add_nutrition_label_column
Revision ID: 416d79950906
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '416d79950906'
down_revision: Union[str, None] = '395f9b36eaac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    
    analysis_cols = [c['name'] for c in inspector.get_columns('global_analysis_results')]
    if 'nutrition_label' not in analysis_cols:
        op.add_column('global_analysis_results', sa.Column('nutrition_label', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    else:
        print("Column 'nutrition_label' already exists. Skipping.")

    fav_indexes = [ix['name'] for ix in inspector.get_indexes('user_favorites')]
  
    if 'ix_user_favorites_document_id' in fav_indexes:
        op.drop_index('ix_user_favorites_document_id', table_name='user_favorites')
    
    if 'ix_user_favorites_global_document_id' not in fav_indexes:
        op.create_index(op.f('ix_user_favorites_global_document_id'), 'user_favorites', ['global_document_id'], unique=False)
    else:
        print("Index 'ix_user_favorites_global_document_id' already exists. Skipping.")


def downgrade() -> None:
    op.drop_index(op.f('ix_user_favorites_global_document_id'), table_name='user_favorites')
    op.create_index('ix_user_favorites_document_id', 'user_favorites', ['global_document_id'], unique=False)
    op.drop_column('global_analysis_results', 'nutrition_label')