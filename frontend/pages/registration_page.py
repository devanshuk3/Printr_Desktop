import customtkinter as ctk
from backend.database import add_vendor
from backend.auth.auth_manager import register_vendor_auth
from frontend.theme import Theme
from tkinter import messagebox

class RegistrationPage(ctk.CTkScrollableFrame):
    def __init__(self, parent, controller, **kwargs):
        super().__init__(parent, fg_color="#FFFFFF", corner_radius=20, border_width=1, border_color=Theme.CLR_BORDER, **kwargs)
        self.controller = controller

        ctk.CTkLabel(self, text="Vendor Registration", font=Theme.FONTS["h1"], text_color=Theme.CLR_TEXT_MAIN).pack(pady=(30, 10))
        ctk.CTkLabel(self, text="Please provide your details to register as a partner", font=Theme.FONTS["body"], text_color=Theme.CLR_TEXT_SEC).pack(pady=(0, 30))

        fields = [
            ("Vendor ID", "Enter Unique ID"),
            ("Password", "Enter Password"),
            ("Full Name", "Enter Your Full Name"),
            ("Shop Name", "Enter Business/Shop Name"),
            ("Phone", "Enter 10-digit mobile number"),
            ("UPI ID", "merchant@upi"),
            ("Address", "Enter complete shop address"),
            ("B/W Price", "e.g. 5.00"),
            ("Color Price", "e.g. 15.00")
        ]

        self.reg_entries = {}
        for label, placeholder in fields:
            ctk.CTkLabel(self, text=label, font=Theme.FONTS["body_bold"], text_color=Theme.CLR_TEXT_MAIN).pack(anchor="w", padx=40)
            entry = ctk.CTkEntry(self, height=40, placeholder_text=placeholder, fg_color="#F8FAFC", border_color=Theme.CLR_BORDER, show="*" if label == "Password" else "")
            entry.pack(fill="x", pady=(5, 15), padx=40)
            self.reg_entries[label] = entry

        ctk.CTkLabel(self, text="Paper Sizes (comma separated)", font=Theme.FONTS["body_bold"], text_color=Theme.CLR_TEXT_MAIN).pack(anchor="w", padx=40)
        paper_sizes_entry = ctk.CTkEntry(self, height=40, placeholder_text="A4, A3, letter", fg_color="#F8FAFC", border_color=Theme.CLR_BORDER)
        paper_sizes_entry.pack(fill="x", pady=(5, 15), padx=40)
        self.reg_entries["Paper Sizes"] = paper_sizes_entry

        ctk.CTkButton(self, text="Create Account", height=50, font=Theme.FONTS["body_bold"], 
                      fg_color=Theme.CLR_PRIMARY, hover_color="#1E40AF", 
                      command=self.handle_registration).pack(fill="x", pady=(20, 10), padx=40)

        ctk.CTkButton(self, text="Back to Login", height=40, font=Theme.FONTS["small"], 
                      fg_color="transparent", text_color=Theme.CLR_TEXT_SEC, hover_color="#F1F5F9", 
                      command=lambda: controller.show_page("login")).pack(fill="x", pady=(0, 30), padx=40)

    def handle_registration(self):
        data = {str(k): v.get() for k, v in self.reg_entries.items()}
        
        if not data.get("Vendor ID") or not data.get("Password") or not data.get("Full Name"):
            messagebox.showwarning("Input Error", "Vendor ID, Password, and Full Name are required.")
            return

        try:
            vendor_payload = {
                "vendor_id": data.get("Vendor ID"),
                "name": data.get("Full Name"),
                "shop_name": data.get("Shop Name"),
                "phone": data.get("Phone"),
                "upi_id": data.get("UPI ID"),
                "address": data.get("Address"),
                "bw_price": float(data.get("B/W Price")) if data.get("B/W Price") else 0,
                "color_price": float(data.get("Color Price")) if data.get("Color Price") else 0,
                "paper_sizes": [s.strip() for s in data.get("Paper Sizes").split(",")] if data.get("Paper Sizes") else []
            }

            if add_vendor(vendor_payload):
                if register_vendor_auth(str(data.get("Vendor ID")), str(data.get("Password"))):
                    messagebox.showinfo("Success", "Vendor registered successfully! You can now log in.")
                    self.controller.show_page("login")
                else:
                    messagebox.showerror("Error", "Account registration failed in auth system.")
            else:
                messagebox.showerror("Error", "Could not save vendor details.")
        except Exception as e:
            messagebox.showerror("Error", f"An error occurred: {e}")
