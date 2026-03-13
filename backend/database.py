import psycopg2
from psycopg2.extras import RealDictCursor
import os
import html
import re

def sanitize_string(value):
    """Sanitize string inputs to prevent XSS and malformed input."""
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        value = html.escape(value)
        return value
    return value

# Supabase Connection Details
DB_URL = "postgresql://postgres:Yadav%405467890@db.jduoonbxrlmifpctncnl.supabase.co:5432/postgres"

def get_connection():
    """Establish and return a database connection."""
    try:
        conn = psycopg2.connect(DB_URL)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def init_db():
    """Initialize the database schema."""
    schema = """
    CREATE TABLE IF NOT EXISTS vendors (
        vendor_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        shop_name VARCHAR(100),
        phone VARCHAR(20),
        upi_id VARCHAR(100),
        address TEXT,
        bw_price NUMERIC(10, 2),
        color_price NUMERIC(10, 2),
        paper_sizes TEXT[]
    );

    CREATE TABLE IF NOT EXISTS vendor_auth (
        id SERIAL PRIMARY KEY,
        vendor_id VARCHAR(50) REFERENCES vendors(vendor_id) ON DELETE CASCADE,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    conn = get_connection()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute(schema)
            conn.commit()
            print("Database schema initialized successfully.")
        except Exception as e:
            print(f"Error initializing schema: {e}")
        finally:
            cur.close()
            conn.close()

def add_vendor(vendor_data):
    """Insert a new vendor into the database."""
    query = """
    INSERT INTO vendors (vendor_id, name, shop_name, phone, upi_id, address, bw_price, color_price, paper_sizes)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING vendor_id;
    """
    conn = get_connection()
    if not conn:
        return None
    
    try:
        cur = conn.cursor()
        cur.execute(query, (
            sanitize_string(vendor_data.get('vendor_id')),
            sanitize_string(vendor_data.get('name')),
            sanitize_string(vendor_data.get('shop_name')),
            sanitize_string(vendor_data.get('phone')),
            sanitize_string(vendor_data.get('upi_id')),
            sanitize_string(vendor_data.get('address')),
            vendor_data.get('bw_price'),
            vendor_data.get('color_price'),
            [sanitize_string(ps) for ps in vendor_data.get('paper_sizes', [])] if vendor_data.get('paper_sizes') else None
        ))
        vendor_id = cur.fetchone()[0]
        conn.commit()
        return vendor_id
    except Exception as e:
        print(f"Error adding vendor: {e}")
        return None
    finally:
        cur.close()
        conn.close()

def get_vendor_by_id(vendor_id):
    """Fetch vendor details by ID."""
    query = "SELECT * FROM vendors WHERE vendor_id = %s"
    conn = get_connection()
    if not conn:
        return None
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(query, (vendor_id,))
        return cur.fetchone()
    except Exception as e:
        print(f"Error fetching vendor: {e}")
        return None
    finally:
        cur.close()
        conn.close()

def update_vendor_upi(vendor_id, upi_id):
    """Update the UPI ID for a specific vendor."""
    query = "UPDATE vendors SET upi_id = %s WHERE vendor_id = %s RETURNING vendor_id;"
    conn = get_connection()
    if not conn:
        return False
    
    try:
        cur = conn.cursor()
        cur.execute(query, (sanitize_string(upi_id), sanitize_string(vendor_id)))
        updated_id = cur.fetchone()
        conn.commit()
        return bool(updated_id)
    except Exception as e:
        print(f"Error updating UPI ID: {e}")
        return False
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    init_db()
