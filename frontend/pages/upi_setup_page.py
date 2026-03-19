import customtkinter as ctk
from frontend.theme import Theme
from frontend.api_client import APIClient
from frontend.components.modern_dialog import show_modern_message

class UpiSetupPage(ctk.CTkFrame):
    def __init__(self, parent, controller, **kwargs):
        super().__init__(parent, fg_color="transparent", **kwargs)
        self.controller = controller

        config_card = self.create_card(self)
        config_card.pack(fill="x")

        inner = ctk.CTkFrame(config_card, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=40, pady=40)

        ctk.CTkLabel(inner, text="UPI Payment Setup", font=Theme.FONTS["h2"], text_color=Theme.CLR_TEXT_MAIN).pack(anchor="w", pady=(0, 10))
        ctk.CTkLabel(inner, text="Configure your UPI ID to receive direct payments from customers.", font=Theme.FONTS["body"], text_color=Theme.CLR_TEXT_SEC).pack(anchor="w", pady=(0, 30))

        # UPI ID Input
        ctk.CTkLabel(inner, text="Merchant UPI ID", font=Theme.FONTS["body_bold"]).pack(anchor="w")
        self.upi_entry = ctk.CTkEntry(inner, placeholder_text="merchant@upi", height=45, 
                                     fg_color=Theme.CLR_INPUT_BG, border_color=Theme.CLR_BORDER,
                                     text_color=Theme.CLR_INPUT_TEXT, placeholder_text_color=Theme.CLR_TEXT_SEC)
        self.upi_entry.pack(fill="x", pady=(8, 20))
        self.upi_entry.bind("<Return>", self.handle_save)

        # QR Code Display area (Placeholder)
        qr_frame = ctk.CTkFrame(inner, fg_color="#F8FAFC", height=200, corner_radius=12, border_width=1, border_color=Theme.CLR_BORDER)
        qr_frame.pack(fill="x", pady=10)
        qr_frame.pack_propagate(False)

        ctk.CTkLabel(qr_frame, text="QR Code Preview", font=Theme.FONTS["body_bold"], text_color=Theme.CLR_TEXT_SEC).place(relx=0.5, rely=0.4, anchor="center")
        ctk.CTkLabel(qr_frame, text="The QR code will be generated automatically based on your UPI ID", font=Theme.FONTS["small"], text_color=Theme.CLR_TEXT_SEC).place(relx=0.5, rely=0.6, anchor="center")

        # Save Button
        self.save_btn = ctk.CTkButton(inner, text="Save UPI Configuration", height=45, fg_color=Theme.CLR_PRIMARY, hover_color="#1E40AF",
                      font=Theme.FONTS["body_bold"], width=220, command=self.handle_save)
        self.save_btn.pack(anchor="w", pady=(30, 0))

        self.load_current_upi()

    def load_current_upi(self):
        vendor_id = getattr(self.controller, 'current_vendor_id', None)
        if vendor_id:
            result = APIClient.get_vendor_info(vendor_id)
            if result.get("success"):
                vendor = result.get("vendor", {})
                if vendor.get("upi_id"):
                    self.upi_entry.delete(0, 'end')
                    self.upi_entry.insert(0, vendor.get("upi_id"))

    def handle_save(self, event=None):
        upi_id = self.upi_entry.get().strip()
        if not upi_id:
            show_modern_message("Input Error", "Please enter a valid UPI ID", icon="warning")
            return
            
        vendor_id = getattr(self.controller, 'current_vendor_id', None)
        if not vendor_id:
            show_modern_message("Session Error", "Could not identify the logged in vendor.", icon="error")
            return
            
        result = APIClient.update_upi(vendor_id, upi_id)
        if result.get("success"):
            show_modern_message("Success", "UPI Configuration saved successfully!")
        else:
            show_modern_message("API Error", result.get("message", "Failed to update UPI Configuration."), icon="error")

    def create_card(self, parent, **kwargs):
        return ctk.CTkFrame(parent, fg_color="#FFFFFF", border_width=1, border_color=Theme.CLR_BORDER, corner_radius=12, **kwargs)
