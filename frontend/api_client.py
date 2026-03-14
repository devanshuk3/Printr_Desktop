import requests
import os
import json

# REPLACE THIS with your actual Render URL after deploying
# Production URL for Render deployment
API_BASE_URL = "https://printr-desktop.onrender.com" 
# Use "http://localhost:5000" for local development

SESSION_FILE = os.path.expanduser("~/.printr_session.json")

class APIClient:
    AUTH_TOKEN = None

    @staticmethod
    def save_session(vendor_id, token):
        try:
            with open(SESSION_FILE, 'w') as f:
                json.dump({"vendor_id": vendor_id, "token": token}, f)
        except Exception as e:
            print(f"Failed to save session: {e}")

    @staticmethod
    def load_session():
        if os.path.exists(SESSION_FILE):
            try:
                with open(SESSION_FILE, 'r') as f:
                    data = json.load(f)
                    APIClient.AUTH_TOKEN = data.get("token")
                    return data
            except Exception as e:
                print(f"Failed to load session: {e}")
        return None

    @staticmethod
    def clear_session():
        APIClient.AUTH_TOKEN = None
        if os.path.exists(SESSION_FILE):
            try:
                os.remove(SESSION_FILE)
            except:
                pass

    @staticmethod
    def login(vendor_id, password):
        try:
            response = requests.post(f"{API_BASE_URL}/api/login", json={
                "vendor_id": vendor_id,
                "password": password
            }, timeout=5)
            if response.status_code == 200:
                data = response.json()
                token = data.get("token")
                APIClient.AUTH_TOKEN = token
                APIClient.save_session(vendor_id, token)
                return data
            return {"success": False, "message": "Login failed"}
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
    def get_headers():
        headers = {}
        if APIClient.AUTH_TOKEN:
            headers["Authorization"] = f"Bearer {APIClient.AUTH_TOKEN}"
        return headers

    @staticmethod
    def update_upi(vendor_id, upi_id):
        try:
            response = requests.post(f"{API_BASE_URL}/api/update-upi", 
                                     json={"upi_id": upi_id}, 
                                     headers=APIClient.get_headers(),
                                     timeout=60)
            return response.json() if response.status_code == 200 else {"success": False, "message": "Update failed"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    @staticmethod
    def get_dashboard_stats(vendor_id):
        try:
            response = requests.get(f"{API_BASE_URL}/api/dashboard-stats", 
                                    headers=APIClient.get_headers(),
                                    timeout=10)
            return response.json() if response.status_code == 200 else {"success": False}
        except Exception as e:
            return {"success": False, "message": str(e)}

    @staticmethod
    def get_print_queue(vendor_id):
        try:
            response = requests.get(f"{API_BASE_URL}/api/print-queue", 
                                    headers=APIClient.get_headers(),
                                    timeout=10)
            return response.json() if response.status_code == 200 else {"success": False, "queue": []}
        except Exception as e:
            return {"success": False, "message": str(e), "queue": []}

    @staticmethod
    def seed_demo(vendor_id):
        try:
            requests.post(f"{API_BASE_URL}/api/seed-demo", json={"vendor_id": vendor_id}, timeout=10)
        except:
            pass
