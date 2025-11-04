#!/usr/bin/env python3
"""
Database Initialization Script
Creates all tables from schema file
"""

import os
import sys
from db_connection import get_db_config, get_db_connection, return_db_connection, init_db_pool

def read_schema_file():
    """Read the SQL schema file"""
    schema_path = os.path.join(os.path.dirname(__file__), 'db_schema.sql')
    try:
        with open(schema_path, 'r') as f:
            return f.read()
    except Exception as e:
        print(f"Error reading schema file: {e}")
        return None

def init_database():
    """Initialize the database with schema"""
    print("Initializing PostgreSQL database...")
    
    # Initialize connection pool
    if not init_db_pool():
        print("Failed to initialize database connection pool")
        return False
    
    # Read schema
    schema_sql = read_schema_file()
    if not schema_sql:
        print("Failed to read schema file")
        return False
    
    conn = get_db_connection()
    if not conn:
        print("Failed to get database connection")
        return False
    
    try:
        with conn.cursor() as cursor:
            # Execute schema SQL
            cursor.execute(schema_sql)
            conn.commit()
            print("✅ Database schema created successfully!")
            
            # Insert default branches
            insert_default_branches(cursor)
            conn.commit()
            print("✅ Default branches inserted!")
            
            return True
    except Exception as e:
        conn.rollback()
        print(f"❌ Error initializing database: {e}")
        return False
    finally:
        return_db_connection(conn)

def insert_default_branches(cursor):
    """Insert default branch data"""
    branches = [
        ("townshop", "TOWNSHOP (Head Office)", "Shop No.1 Continental Building Independence Avenue - Windhoek", "814683999"),
        ("khomasdal", "KHOMASDAL DPC", "Shop No.2 Khomasdal Funky Town - Windhoek", "814682991"),
        ("katima", "KATIMA DPC", "Opposite Open Market Hospital Road, Katima", "817375818"),
        ("outapi", "OUTAPI DPC", "Okasilili Location in Christmas Building, Next Tolemeka Garage Main Road Oshakati - Outapi", "814685886"),
        ("ondangwa", "ONDANGWA DPC", "Shop No.3 Woerman Block Oluno, Opposite Fresco, Cash and Carry Entrance Ondangwa", "814685882"),
        ("okongo", "OKONGO DPC", "Handongo Festus Erf 333 Okongo Village Council", "814684935"),
        ("okahao", "OKAHAO DPC", "Iteka complex opposite Pep store Okahao - Oshakati main road", "814683963"),
        ("nkurenkuru", "NKURENKURU DPC", "Total Service Station, Next to Oluno Bar - Nkurenkuru", "814684939"),
        ("swakopmund", "SWAKOPMUND DPC", "Opposite Mondesa Usave Swakopmund", "814686806"),
        ("hochland-park", "HOCHLAND PARK", "House No.2 Robin Road, Taubern Glain Street, Next to OK Food Windhoek", "813207195"),
        ("rundu", "RUNDU DPC", "Shop No.1 Rundu Shopping Complex Rundu", "814687858"),
        ("gobabis", "GOBABIS DPC", "Shop No.1 Opposite Gobabis Medical Centre Main Road Gobabis", "814688868"),
        ("walvisbay", "WALVIS BAY DPC", "Shop No.7 Mondesa Centre - Opposite Usave Walvis Bay", "814686840"),
        ("eenhana", "EENHANA DPC", "Shop No.2 Next to Nampost Eenhana Main Road", "814685870"),
        ("otjiwarongo", "OTJIWARONGO DPC", "Shop No.4 Opposite Biltong Shop Otjiwarongo Main Road", "814686815")
    ]
    
    for branch in branches:
        cursor.execute("""
            INSERT INTO branches (id, name, location, phone)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, branch)

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)

