"""move_favorites_to_global_documents
Revision ID: 395f9b36eaac
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '395f9b36eaac'
down_revision: Union[str, None] = '9f55ad1183b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Get columns for user_favorites
    columns = [c['name'] for c in inspector.get_columns('user_favorites')]
    
    # If the column is still named 'document_id', we need to migrate it
    if 'document_id' in columns and 'global_document_id' not in columns:
        existing_unique = [c['name'] for c in inspector.get_unique_constraints('user_favorites')]
        if 'unique_user_document_favorite' in existing_unique:
            op.drop_constraint('unique_user_document_favorite', 'user_favorites', type_='unique')
            
        op.alter_column('user_favorites', 'document_id', new_column_name='global_document_id')
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
    else:
        print("Column 'global_document_id' already exists in 'user_favorites'. Skipping rename.")

def downgrade() -> None:
    # Standard downgrade logic
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