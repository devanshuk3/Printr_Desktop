import customtkinter as ctk
from frontend.theme import Theme

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
        ctk.CTkComboBox(box1, values=["USB 3.0", "TCP/IP (Ethernet)", "Bluetooth 5.0", "Serial"], height=40).pack(fill="x", pady=8)

        box2 = ctk.CTkFrame(inner, fg_color="transparent")
        box2.grid(row=1, column=1, sticky="nsew", pady=(0, 20))
        ctk.CTkLabel(box2, text="Assigned Hardware", font=Theme.FONTS["body_bold"]).pack(anchor="w")
        ctk.CTkEntry(box2, placeholder_text="Scanning devices...", height=40, border_color=Theme.CLR_BORDER).pack(fill="x", pady=8)

        ctk.CTkButton(inner, text="Save & Initialize Interface", height=45, fg_color=Theme.CLR_PRIMARY, 
                      font=Theme.FONTS["body_bold"], width=220).grid(row=2, column=0, sticky="w", pady=(20, 0))

    def create_card(self, parent, **kwargs):
        return ctk.CTkFrame(parent, fg_color="#FFFFFF", border_width=1, border_color=Theme.CLR_BORDER, corner_radius=12, **kwargs)
