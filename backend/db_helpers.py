#!/usr/bin/env python3
"""
Database Helper Functions
Common database operations for all entities
"""

from db_connection import get_db_connection, return_db_connection
from psycopg2.extras import RealDictCursor, Json
import json
from datetime import datetime

def dict_to_jsonb(data):
    """Convert Python dict to PostgreSQL JSONB"""
    if data is None:
        return None
    return Json(data)

def jsonb_to_dict(data):
    """Convert PostgreSQL JSONB to Python dict"""
    if data is None:
        return None
    if isinstance(data, str):
        return json.loads(data)
    return data

def get_all(table_name, filters=None, order_by=None):
    """Get all records from a table"""
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        query = f"SELECT * FROM {table_name}"
        params = []
        
        if filters:
            conditions = []
            for key, value in filters.items():
                conditions.append(f"{key} = %s")
                params.append(value)
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
        
        if order_by:
            query += f" ORDER BY {order_by}"
        
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            results = cursor.fetchall()
            # Convert RealDictRow to dict and handle JSONB
            return [dict(row) for row in results]
    except Exception as e:
        print(f"Error getting records from {table_name}: {e}")
        return []
    finally:
        return_db_connection(conn)

def get_by_id(table_name, id_value, id_column='id'):
    """Get a single record by ID"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        query = f"SELECT * FROM {table_name} WHERE {id_column} = %s"
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, (id_value,))
            result = cursor.fetchone()
            return dict(result) if result else None
    except Exception as e:
        print(f"Error getting record from {table_name}: {e}")
        return None
    finally:
        return_db_connection(conn)

def insert(table_name, data):
    """Insert a new record"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        columns = ', '.join(data.keys())
        placeholders = ', '.join(['%s'] * len(data))
        values = list(data.values())
        
        # Convert dict/list to JSONB
        for i, value in enumerate(values):
            if isinstance(value, (dict, list)):
                values[i] = Json(value)
        
        query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders}) RETURNING *"
        
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, values)
            result = cursor.fetchone()
            conn.commit()
            return dict(result) if result else None
    except Exception as e:
        conn.rollback()
        print(f"Error inserting into {table_name}: {e}")
        return None
    finally:
        return_db_connection(conn)

def update(table_name, id_value, data, id_column='id'):
    """Update a record"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        # Add updated_at timestamp
        data['updated_at'] = datetime.utcnow()
        
        set_clause = ', '.join([f"{key} = %s" for key in data.keys()])
        values = list(data.values())
        values.append(id_value)
        
        # Convert dict/list to JSONB
        for i, value in enumerate(values[:-1]):  # Exclude id_value
            if isinstance(value, (dict, list)):
                values[i] = Json(value)
        
        query = f"UPDATE {table_name} SET {set_clause} WHERE {id_column} = %s RETURNING *"
        
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, values)
            result = cursor.fetchone()
            conn.commit()
            return dict(result) if result else None
    except Exception as e:
        conn.rollback()
        print(f"Error updating {table_name}: {e}")
        return None
    finally:
        return_db_connection(conn)

def delete(table_name, id_value, id_column='id'):
    """Delete a record"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        query = f"DELETE FROM {table_name} WHERE {id_column} = %s"
        with conn.cursor() as cursor:
            cursor.execute(query, (id_value,))
            conn.commit()
            return cursor.rowcount > 0
    except Exception as e:
        conn.rollback()
        print(f"Error deleting from {table_name}: {e}")
        return False
    finally:
        return_db_connection(conn)

