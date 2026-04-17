"""add_monitoring_columns

Revision ID: a1b2c3d4e5f6
Revises: 416d79950906
Create Date: 2025-01-08
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '416d79950906'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Check global_analysis_results table
    columns = [c['name'] for c in inspector.get_columns('global_analysis_results')]
    
    if 'is_monitored' not in columns:
        op.add_column('global_analysis_results', sa.Column('is_monitored', sa.Boolean(), server_default='true', nullable=False))
        op.create_index('ix_global_analysis_results_is_monitored', 'global_analysis_results', ['is_monitored'], unique=False)
    else:
        print("Column 'is_monitored' already exists. Skipping.")

    if 'last_automated_check' not in columns:
        op.add_column('global_analysis_results', sa.Column('last_automated_check', sa.DateTime(timezone=True), nullable=True))
    else:
        print("Column 'last_automated_check' already exists. Skipping.")


def downgrade() -> None:
    op.drop_index('ix_global_analysis_results_is_monitored', table_name='global_analysis_results')
    op.drop_column('global_analysis_results', 'last_automated_check')
    op.drop_column('global_analysis_results', 'is_monitored')
