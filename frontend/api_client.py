import requests
import os
import json

# Development URL: http://localhost:5000
# Production URL: https://printr-desktop.onrender.com
API_BASE_URL = "https://printr-desktop.onrender.com" 


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
    def get_vendor_info(vendor_id):
        try:
            response = requests.get(f"{API_BASE_URL}/api/vendor-info", 
                                    headers=APIClient.get_headers(),
                                    timeout=10)
            return response.json() if response.status_code == 200 else {"success": False}
        except Exception as e:
            return {"success": False, "message": str(e)}

    @staticmethod
    def get_printer_config(vendor_id):
        try:
            response = requests.get(f"{API_BASE_URL}/api/printer-config", 
                                    headers=APIClient.get_headers(),
                                    timeout=10)
            return response.json() if response.status_code == 200 else {"success": False}
        except Exception as e:
            return {"success": False, "message": str(e)}

    @staticmethod
    def update_printer_config(vendor_id, printer_name, status="Online"):
        try:
            response = requests.post(f"{API_BASE_URL}/api/printer-config", 
                                     json={"printer_name": printer_name, "status": status},
                                     headers=APIClient.get_headers(),
                                     timeout=10)
            return response.json() if response.status_code == 200 else {"success": False}
        except Exception as e:
            return {"success": False, "message": str(e)}

    @staticmethod
    def seed_demo(vendor_id):
        try:
            requests.post(f"{API_BASE_URL}/api/seed-demo", json={"vendor_id": vendor_id}, timeout=10)
        except:
            pass

    # ──────────── R2 Cloud Storage Methods ────────────

    @staticmethod
    def list_r2_files(vendor_id):
        """List all files in the vendor's R2 cloud storage folder."""
        try:
            response = requests.get(
                f"{API_BASE_URL}/api/r2/files",
                headers=APIClient.get_headers(),
                timeout=30,
            )
            if response.status_code == 200:
                return response.json()
            return {"success": False, "files": [], "message": "Failed to fetch files"}
        except Exception as e:
            return {"success": False, "files": [], "message": str(e)}

    @staticmethod
    def download_r2_file(vendor_id, file_key):
        """Get a pre-signed download URL for a file in R2."""
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/r2/download",
                json={"file_key": file_key},
                headers=APIClient.get_headers(),
                timeout=15,
            )
            if response.status_code == 200:
                return response.json()
            return {"success": False, "message": "Failed to get download URL"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    @staticmethod
    def delete_r2_file(vendor_id, file_key):
        """Delete a file from the vendor's R2 cloud storage."""
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/r2/delete",
                json={"file_key": file_key},
                headers=APIClient.get_headers(),
                timeout=15,
            )
            if response.status_code == 200:
                return response.json()
            return {"success": False, "message": "Failed to delete file"}
        except Exception as e:
            return {"success": False, "message": str(e)}
