import os

from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

if __package__:
    from .models import Base
else:
    from models import Base


def database_url(value):
    if value.startswith('postgres://'):
        return 'postgresql+psycopg://' + value[len('postgres://'):]
    if value.startswith('postgresql://'):
        return 'postgresql+psycopg://' + value[len('postgresql://'):]
    return value


def make_engine(url=None):
    options = {'poolclass': NullPool} if os.getenv('VERCEL') or os.getenv('DB_POOL', '').lower() == 'null' else {'pool_pre_ping': True}
    return create_engine(database_url(url or os.getenv('DATABASE_URL', 'postgresql+psycopg:///daftari')), **options)


def initialize_database(engine):
    with engine.begin() as connection:
        if engine.dialect.name == 'postgresql':
            connection.execute(text('SELECT pg_advisory_xact_lock(647428761)'))
        Base.metadata.create_all(connection)
        if engine.dialect.name == 'postgresql':
            period_length = connection.execute(text("""
                SELECT character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'liquidity_months'
                  AND column_name = 'month'
            """)).scalar()
            if period_length is not None and period_length < 10:
                connection.execute(text('ALTER TABLE liquidity_months ALTER COLUMN month TYPE VARCHAR(10)'))
