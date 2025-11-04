#!/usr/bin/env python3
"""
PostgreSQL Database Connection Module
Handles database connection and connection pooling
"""

import os
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
import logging

logger = logging.getLogger(__name__)

# Database connection pool
connection_pool = None

def get_db_config():
    """Get database configuration from environment variables"""
    import getpass
    default_user = getpass.getuser()  # Use current macOS username
    return {
        'host': os.environ.get('DB_HOST', 'localhost'),
        'port': os.environ.get('DB_PORT', '5432'),
        'database': os.environ.get('DB_NAME', 'dynapharm'),
        'user': os.environ.get('DB_USER', default_user),
        'password': os.environ.get('DB_PASSWORD', '')  # Usually empty for local PostgreSQL
    }

def init_db_pool(min_conn=1, max_conn=10):
    """Initialize database connection pool"""
    global connection_pool
    try:
        config = get_db_config()
        connection_pool = psycopg2.pool.SimpleConnectionPool(
            min_conn,
            max_conn,
            **config
        )
        logger.info("Database connection pool initialized")
        return True
    except Exception as e:
        logger.error(f"Error initializing database pool: {e}")
        return False

def get_db_connection():
    """Get a database connection from the pool"""
    if connection_pool is None:
        init_db_pool()
    
    try:
        return connection_pool.getconn()
    except Exception as e:
        logger.error(f"Error getting database connection: {e}")
        return None

def return_db_connection(conn):
    """Return a connection to the pool"""
    if connection_pool and conn:
        try:
            connection_pool.putconn(conn)
        except Exception as e:
            logger.error(f"Error returning connection to pool: {e}")

def close_db_pool():
    """Close all database connections in the pool"""
    global connection_pool
    if connection_pool:
        connection_pool.closeall()
        connection_pool = None
        logger.info("Database connection pool closed")

def execute_query(query, params=None, fetch=True):
    """Execute a query and return results"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            if fetch:
                return cursor.fetchall()
            conn.commit()
            return True
    except Exception as e:
        conn.rollback()
        logger.error(f"Error executing query: {e}")
        return None
    finally:
        return_db_connection(conn)

