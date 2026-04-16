"""Add is_admin column to users table

Revision ID: 5b8d6e7062dd
Revises: 66e2c98c2bff
Create Date: 2025-01-07
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '5b8d6e7062dd'
down_revision: Union[str, None] = '66e2c98c2bff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Get all existing columns in the users table
    columns = [c['name'] for c in inspector.get_columns('users')]

    # Only add the column and index if 'is_admin' is missing
    if 'is_admin' not in columns:
        op.add_column('users', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false'))
        op.create_index('idx_users_is_admin', 'users', ['is_admin'])
    else:
        print("Column 'is_admin' already exists on 'users' table. Skipping.")


def downgrade() -> None:
    # Drop index and column
    op.drop_index('idx_users_is_admin', table_name='users')
    op.drop_column('users', 'is_admin')