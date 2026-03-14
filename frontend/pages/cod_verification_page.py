import customtkinter as ctk
from frontend.theme import Theme

class CodVerificationPage(ctk.CTkFrame):
    def __init__(self, parent, controller, **kwargs):
        super().__init__(parent, fg_color="transparent", **kwargs)
        self.controller = controller

        main_grid = ctk.CTkFrame(self, fg_color="transparent")
        main_grid.pack(fill="both", expand=True)
        main_grid.grid_columnconfigure(0, weight=3)
        main_grid.grid_columnconfigure(1, weight=2)

        input_card = self.create_card(main_grid)
        input_card.grid(row=0, column=0, sticky="nsew", padx=(0, 25))

        inner_input = ctk.CTkFrame(input_card, fg_color="transparent")
        inner_input.pack(fill="both", expand=True, padx=40, pady=40)

        ctk.CTkLabel(inner_input, text="Transaction Verification", font=Theme.FONTS["h2"]).pack(anchor="w", pady=(0, 10))
        ctk.CTkLabel(inner_input, text="Scan or manually enter the Order ID to verify payment", font=Theme.FONTS["body"], text_color=Theme.CLR_TEXT_SEC).pack(anchor="w", pady=(0, 30))
        
        ctk.CTkLabel(inner_input, text="Scan Order ID", font=Theme.FONTS["body_bold"]).pack(anchor="w")
        order_entry = ctk.CTkEntry(inner_input, placeholder_text="e.g. #ORD-7721", height=50, 
                                   fg_color=Theme.CLR_INPUT_BG, border_color=Theme.CLR_BORDER,
                                   text_color=Theme.CLR_INPUT_TEXT, placeholder_text_color=Theme.CLR_TEXT_SEC)
        order_entry.pack(fill="x", pady=(8, 40))

        btn_frame = ctk.CTkFrame(inner_input, fg_color="transparent")
        btn_frame.pack(fill="x")
        
        ctk.CTkButton(btn_frame, text="Reject Order", fg_color="transparent", border_width=1, border_color=Theme.CLR_DANGER,
                      text_color=Theme.CLR_DANGER, hover_color="#FEF2F2", width=150, height=48, font=Theme.FONTS["body_bold"]).pack(side="left", padx=(0, 15))
        
        ctk.CTkButton(btn_frame, text="Verify & Process Print", fg_color=Theme.CLR_SUCCESS, hover_color="#15803D",
                      height=48, font=Theme.FONTS["body_bold"]).pack(side="left", fill="x", expand=True)

        log_card = self.create_card(main_grid)
        log_card.grid(row=0, column=1, sticky="nsew")
        log_card.configure(fg_color=Theme.CLR_BG) # Use theme background

        ctk.CTkLabel(log_card, text="Verification Activity", font=Theme.FONTS["body_bold"], text_color=Theme.CLR_TEXT_MAIN).pack(pady=(30, 20))
        
        logs_inner = ctk.CTkFrame(log_card, fg_color="transparent")
        logs_inner.pack(fill="both", expand=True, padx=20)
        ctk.CTkLabel(logs_inner, text="No recent activity", text_color=Theme.CLR_TEXT_SEC, font=Theme.FONTS["small"]).pack(pady=40)

    def create_card(self, parent, **kwargs):
        return ctk.CTkFrame(parent, fg_color="#FFFFFF", border_width=1, border_color=Theme.CLR_BORDER, corner_radius=12, **kwargs)
