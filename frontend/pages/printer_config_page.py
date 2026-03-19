import customtkinter as ctk
from frontend.theme import Theme
from frontend.api_client import APIClient
from frontend.components.modern_dialog import show_modern_message

class PrinterConfigPage(ctk.CTkFrame):
    def __init__(self, parent, controller, **kwargs):
        super().__init__(parent, fg_color="transparent", **kwargs)
        self.controller = controller

        form_card = self.create_card(self)
        form_card.pack(fill="x")

        inner = ctk.CTkFrame(form_card, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=40, pady=40)

        inner.grid_columnconfigure(0, weight=1)
        inner.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(inner, text="General Settings", font=Theme.FONTS["h2"], text_color=Theme.CLR_TEXT_MAIN).grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 25))

        box1 = ctk.CTkFrame(inner, fg_color="transparent")
        box1.grid(row=1, column=0, sticky="nsew", padx=(0, 20), pady=(0, 20))
        ctk.CTkLabel(box1, text="Connection Protocol", font=Theme.FONTS["body_bold"]).pack(anchor="w")
        self.protocol_cb = ctk.CTkComboBox(box1, values=["USB 3.0", "TCP/IP (Ethernet)", "Bluetooth 5.0", "Serial"], height=40,
                        fg_color=Theme.CLR_INPUT_BG, border_color=Theme.CLR_BORDER,
                        text_color=Theme.CLR_INPUT_TEXT, button_color=Theme.CLR_PRIMARY,
                        button_hover_color="#1E40AF")
        self.protocol_cb.pack(fill="x", pady=8)

        box2 = ctk.CTkFrame(inner, fg_color="transparent")
        box2.grid(row=1, column=1, sticky="nsew", pady=(0, 20))
        ctk.CTkLabel(box2, text="Assigned Hardware", font=Theme.FONTS["body_bold"]).pack(anchor="w")
        self.printer_entry = ctk.CTkEntry(box2, placeholder_text="Enter printer name...", height=40, 
                     fg_color=Theme.CLR_INPUT_BG, border_color=Theme.CLR_BORDER,
                     text_color=Theme.CLR_INPUT_TEXT, placeholder_text_color=Theme.CLR_TEXT_SEC)
        self.printer_entry.pack(fill="x", pady=8)

        ctk.CTkButton(inner, text="Save & Initialize Interface", height=45, fg_color=Theme.CLR_PRIMARY, 
                      font=Theme.FONTS["body_bold"], width=220, command=self.handle_save).grid(row=2, column=0, sticky="w", pady=(20, 0))

        self.load_config()

    def load_config(self):
        vendor_id = getattr(self.controller, 'current_vendor_id', None)
        if vendor_id:
            result = APIClient.get_printer_config(vendor_id)
            if result.get("success") and result.get("config"):
                config = result["config"]
                self.printer_entry.insert(0, config.get("printer_name", ""))

    def handle_save(self):
        printer_name = self.printer_entry.get().strip()
        if not printer_name:
            show_modern_message("Input Error", "Please enter a printer name", icon="warning")
            return
            
        vendor_id = getattr(self.controller, 'current_vendor_id', None)
        result = APIClient.update_printer_config(vendor_id, printer_name)
        if result.get("success"):
            show_modern_message("Success", "Printer configuration saved!")
        else:
            show_modern_message("Error", result.get("message", "Failed to save config"), icon="error")

    def create_card(self, parent, **kwargs):
        return ctk.CTkFrame(parent, fg_color="#FFFFFF", border_width=1, border_color=Theme.CLR_BORDER, corner_radius=12, **kwargs)
