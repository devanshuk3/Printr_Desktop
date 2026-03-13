import bcrypt
from backend.database import get_connection

def hash_password(password):
    """Hash a password for storing."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def check_password(password, hashed):
    """Check a hashed password."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def register_vendor_auth(vendor_id, password):
    """Register authentication details for a vendor."""
    hashed_pw = hash_password(password)
    query = "INSERT INTO vendor_auth (vendor_id, password) VALUES (%s, %s)"
    
    conn = get_connection()
    if not conn:
        return False
    
    try:
        cur = conn.cursor()
        cur.execute(query, (vendor_id, hashed_pw))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error registering auth: {e}")
        return False
    finally:
        cur.close()
        conn.close()

def authenticate_vendor(vendor_id, password):
    """Authenticate a vendor."""
    query = "SELECT password FROM vendor_auth WHERE vendor_id = %s"
    conn = get_connection()
    if not conn:
        return False
    
    try:
        cur = conn.cursor()
        cur.execute(query, (vendor_id,))
        result = cur.fetchone()
        if result:
            hashed_pw = result[0]
            return check_password(password, hashed_pw)
        return False
    except Exception as e:
        print(f"Error authenticating: {e}")
        return False
    finally:
        cur.close()
        conn.close()
