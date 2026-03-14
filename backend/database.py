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

# Supabase Connection Details (Pooled Connection)
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres.jduoonbxrlmifpctncnl:Yadav%405467890@aws-1-ap-south-1.pooler.supabase.com:5432/postgres")

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

    CREATE TABLE IF NOT EXISTS members (
        member_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE,
        upi_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS print_queue (
        order_id SERIAL PRIMARY KEY,
        order_number VARCHAR(20) UNIQUE NOT NULL,
        vendor_id VARCHAR(50) REFERENCES vendors(vendor_id) ON DELETE CASCADE,
        member_id INTEGER REFERENCES members(member_id) ON DELETE SET NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(10),
        page_count INTEGER,
        status VARCHAR(20) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS printer_config (
        id SERIAL PRIMARY KEY,
        vendor_id VARCHAR(50) REFERENCES vendors(vendor_id) ON DELETE CASCADE,
        printer_name VARCHAR(100),
        status VARCHAR(20) DEFAULT 'Offline',
        last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    conn = get_connection()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute(schema)
            conn.commit()
            print("Database schema initialized successfully.")
            
            # Seed data if empty (for demonstration/dashboard)
            cur.execute("SELECT COUNT(*) FROM members")
            if cur.fetchone()[0] == 0:
                print("Seeding initial data...")
                cur.execute("INSERT INTO members (name, email) VALUES ('Aditya Verma', 'aditya@example.com'), ('Sneha Kapoor', 'sneha@example.com'), ('Rohan Das', 'rohan@example.com')")
                conn.commit()
        except Exception as e:
            print(f"Error initializing schema: {e}")
        finally:
            cur.close()
            conn.close()

def get_dashboard_stats(vendor_id):
    """Fetch summary stats for the dashboard cards."""
    conn = get_connection()
    if not conn: return None
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Pending Orders count
        cur.execute("SELECT COUNT(*) FROM print_queue WHERE vendor_id = %s AND status = 'Pending'", (vendor_id,))
        pending = cur.fetchone()['count']
        
        # Printer Status
        cur.execute("SELECT status, last_synced FROM printer_config WHERE vendor_id = %s ORDER BY last_synced DESC LIMIT 1", (vendor_id,))
        printer_info = cur.fetchone()
        
        status = printer_info['status'] if printer_info else "Online"
        last_synced = printer_info['last_synced'].strftime("%H:%M") if printer_info and printer_info['last_synced'] else "Just now"
        
        return {
            "pending_orders": pending,
            "printer_status": status,
            "last_synced": last_synced
        }
    except Exception as e:
        print(f"Stats Error: {e}")
        return None
    finally:
        cur.close()
        conn.close()

def get_print_queue(vendor_id):
    """Fetch the active print queue for a vendor."""
    query = """
    SELECT q.order_number, q.file_name, q.page_count, q.status, COALESCE(m.name, 'Guest') as member_name
    FROM print_queue q
    LEFT JOIN members m ON q.member_id = m.member_id
    WHERE q.vendor_id = %s
    ORDER BY q.created_at DESC
    """
    conn = get_connection()
    if not conn: return []
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(query, (vendor_id,))
        return cur.fetchall()
    except Exception as e:
        print(f"Queue Error: {e}")
        return []
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
