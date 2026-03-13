import psycopg2
from psycopg2.extras import RealDictCursor
import os

# Using the provided connection string
DB_URL = "postgresql://neondb_owner:npg_50jmSAozVbaF@ep-silent-mountain-a1elnmeh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

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
            vendor_data['vendor_id'],
            vendor_data['name'],
            vendor_data['shop_name'],
            vendor_data['phone'],
            vendor_data['upi_id'],
            vendor_data['address'],
            vendor_data['bw_price'],
            vendor_data['color_price'],
            vendor_data['paper_sizes']
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

if __name__ == "__main__":
    init_db()
