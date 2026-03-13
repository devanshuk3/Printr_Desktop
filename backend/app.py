from flask import Flask, request, jsonify
from backend.database import get_vendor_by_id, add_vendor, update_vendor_upi
from backend.auth.auth_manager import authenticate_vendor, register_vendor_auth

app = Flask(__name__)

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
        return jsonify({"success": True, "message": "Authenticated"}), 200
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    vendor_id = data.get('vendor_id')
    password = data.get('password')
    vendor_info = data.get('vendor_info', {}) # name, shop_name, etc.
    
    # 1. Add vendor to 'vendors' table
    vendor_info['vendor_id'] = vendor_id
    if add_vendor(vendor_info):
        # 2. Add auth details
        if register_vendor_auth(vendor_id, password):
            return jsonify({"success": True, "message": "Vendor registered successfully"}), 201
        return jsonify({"success": False, "message": "Failed to set password"}), 500
    return jsonify({"success": False, "message": "Failed to create vendor"}), 400

@app.route('/api/update-upi', methods=['POST'])
def update_upi():
    data = request.json
    vendor_id = data.get('vendor_id')
    upi_id = data.get('upi_id')
    if update_vendor_upi(vendor_id, upi_id):
        return jsonify({"success": True, "message": "UPI updated"}), 200
    return jsonify({"success": False, "message": "Failed to update UPI"}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)
