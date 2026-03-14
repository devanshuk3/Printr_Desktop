from flask import Flask, request, jsonify
from functools import wraps
from backend.database import (
    get_vendor_by_id, add_vendor, update_vendor_upi, 
    get_dashboard_stats, get_print_queue
)
from backend.auth.auth_manager import (
    authenticate_vendor, register_vendor_auth, 
    create_token, verify_token
)
import threading
import time
import requests

app = Flask(__name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({"success": False, "message": "Token is missing"}), 401
        
        # Expecting 'Bearer <token>'
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
            
        vendor_id = verify_token(token)
        if not vendor_id:
            return jsonify({"success": False, "message": "Token is invalid or expired"}), 401
        
        return f(vendor_id, *args, **kwargs)
    return decorated

SELF_URL = "https://printr-desktop.onrender.com"

def keep_alive():
    """Function to ping the server every 10 minutes to prevent Render from sleeping."""
    # Give the server 20 seconds to fully boot before first ping
    time.sleep(20)
    while True:
        try:
            print(f"Pinging {SELF_URL}...")
            requests.get(SELF_URL, timeout=10)
        except Exception as e:
            print(f"Keep-alive ping failed: {e}")
        time.sleep(600) # 10 minutes

# Start keep-alive thread immediately (runs in production/Gunicorn)
threading.Thread(target=keep_alive, daemon=True).start()

@app.route('/')
def home():
    return jsonify({"status": "healthy", "message": "Printr API is running"}), 200

@app.route('/api/verify-vendor', methods=['POST'])
def verify_vendor():
    data = request.json
    vendor_id = data.get('vendor_id')
    vendor = get_vendor_by_id(vendor_id)
    if vendor:
        return jsonify({"success": True, "vendor": vendor}), 200
    return jsonify({"success": False, "message": "Vendor not found"}), 404

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    vendor_id = data.get('vendor_id')
    password = data.get('password')
    if authenticate_vendor(vendor_id, password):
        token = create_token(vendor_id)
        return jsonify({"success": True, "message": "Authenticated", "token": token}), 200
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    vendor_id = data.get('vendor_id')
    password = data.get('password')
    vendor_info = data.get('vendor_info', {}) 
    
    vendor_info['vendor_id'] = vendor_id
    if add_vendor(vendor_info):
        if register_vendor_auth(vendor_id, password):
            return jsonify({"success": True, "message": "Vendor registered successfully"}), 201
        return jsonify({"success": False, "message": "Failed to set password"}), 500
    return jsonify({"success": False, "message": "Failed to create vendor"}), 400

@app.route('/api/dashboard-stats', methods=['GET'])
@token_required
def dashboard_stats(vendor_id):
    stats = get_dashboard_stats(vendor_id)
    if stats:
        return jsonify({"success": True, "stats": stats}), 200
    return jsonify({"success": False, "message": "Failed to fetch stats"}), 500

@app.route('/api/print-queue', methods=['GET'])
@token_required
def print_queue(vendor_id):
    queue = get_print_queue(vendor_id)
    return jsonify({"success": True, "queue": queue}), 200

@app.route('/api/seed-demo', methods=['POST'])
def seed_demo():
    """Endpoint to seed demo data for a specific vendor."""
    vendor_id = request.json.get('vendor_id')
    from backend.database import get_connection
    conn = get_connection()
    if not conn: return jsonify({"success": False}), 500
    try:
        cur = conn.cursor()
        # Seed some orders for this vendor
        orders = [
            ('#ORD-9928', 'Budget_Draft.pdf', 12, 'In Progress', 1),
            ('#ORD-9930', 'Invoice_V2.png', 1, 'Pending', 2),
            ('#ORD-9931', 'Lecture_Notes.docx', 45, 'Ready', 3)
        ]
        for num, file, pages, status, m_id in orders:
            cur.execute("""
                INSERT INTO print_queue (order_number, file_name, page_count, status, vendor_id, member_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (order_number) DO NOTHING
            """, (num, file, pages, status, vendor_id, m_id))
        conn.commit()
        return jsonify({"success": True, "message": "Demo data seeded"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/update-upi', methods=['POST'])
@token_required
def update_upi(vendor_id):
    data = request.json
    upi_id = data.get('upi_id')
    if update_vendor_upi(vendor_id, upi_id):
        return jsonify({"success": True, "message": "UPI updated"}), 200
    return jsonify({"success": False, "message": "Failed to update UPI"}), 500

# Ensure database tables exist on startup
try:
    from backend.database import init_db
    init_db()
except Exception as e:
    print(f"Server-side DB Init Error: {e}")

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)
