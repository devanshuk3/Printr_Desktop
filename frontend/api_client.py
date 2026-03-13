import requests

# REPLACE THIS with your actual Render URL after deploying
API_BASE_URL = "https://printr-desktop.onrender.com" 

class APIClient:
    @staticmethod
    def login(vendor_id, password):
        try:
            response = requests.post(f"{API_BASE_URL}/api/login", json={
                "vendor_id": vendor_id,
                "password": password
            }, timeout=60)
            return response.json() if response.status_code == 200 else {"success": False, "message": "Login failed"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    @staticmethod
    def register(vendor_id, password, vendor_info):
        try:
            response = requests.post(f"{API_BASE_URL}/api/register", json={
                "vendor_id": vendor_id,
                "password": password,
                "vendor_info": vendor_info
            }, timeout=60)
            return response.json() if response.status_code == 201 else {"success": False, "message": "Registration failed"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    @staticmethod
    def update_upi(vendor_id, upi_id):
        try:
            response = requests.post(f"{API_BASE_URL}/api/update-upi", json={
                "vendor_id": vendor_id,
                "upi_id": upi_id
            }, timeout=60)
            return response.json() if response.status_code == 200 else {"success": False, "message": "Update failed"}
        except Exception as e:
            return {"success": False, "message": str(e)}
