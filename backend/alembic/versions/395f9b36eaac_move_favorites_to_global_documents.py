"""move_favorites_to_global_documents

Revision ID: 395f9b36eaac
Revises: 9f55ad1183b8
Create Date: 2026-04-06 19:56:14.463024

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '395f9b36eaac'
down_revision: Union[str, None] = '9f55ad1183b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing constraints
    op.drop_constraint('unique_user_document_favorite', 'user_favorites', type_='unique')
    op.drop_constraint('user_favorites_document_id_fkey', 'user_favorites', type_='foreignkey')
    
    # Rename the column
    op.alter_column('user_favorites', 'document_id', new_column_name='global_document_id')
    
    # Create new constraints pointing to global_documents
    op.create_foreign_key(
        'user_favorites_global_document_id_fkey', 
        'user_favorites', 'global_documents', 
        ['global_document_id'], ['id'], 
        ondelete='CASCADE'
    )
    op.create_unique_constraint(
        'unique_user_global_document_favorite', 
        'user_favorites', 
        ['user_id', 'global_document_id']
    )

def downgrade() -> None:
    op.drop_constraint('unique_user_global_document_favorite', 'user_favorites', type_='unique')
    op.drop_constraint('user_favorites_global_document_id_fkey', 'user_favorites', type_='foreignkey')
    op.alter_column('user_favorites', 'global_document_id', new_column_name='document_id')
    op.create_foreign_key(
        'user_favorites_document_id_fkey', 
        'user_favorites', 'documents', 
        ['document_id'], ['id'], 
        ondelete='CASCADE'
    )
    op.create_unique_constraint(
        'unique_user_document_favorite', 
        'user_favorites', 
        ['user_id', 'document_id']
    )