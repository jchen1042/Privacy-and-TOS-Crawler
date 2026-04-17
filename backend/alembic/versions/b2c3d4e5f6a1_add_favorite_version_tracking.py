"""add_favorite_version_tracking

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2025-01-08
"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a1'
down_revision = 'a1b2c3d4e5f6'

def upgrade() -> None:
    # Add last_viewed_version to user_favorites
    # We default it to 1 since all existing docs are at least v1
    op.add_column('user_favorites', sa.Column('last_viewed_version', sa.Integer(), server_default='1', nullable=False))

def downgrade() -> None:
    op.drop_column('user_favorites', 'last_viewed_version')