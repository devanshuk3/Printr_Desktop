import customtkinter as ctk
from frontend.theme import Theme

class DashboardPage(ctk.CTkFrame):
    def __init__(self, parent, controller, **kwargs):
        super().__init__(parent, fg_color="transparent", **kwargs)
        self.controller = controller

        # Stats Grid (3 Columns)
        stats_frame = ctk.CTkFrame(self, fg_color="transparent")
        stats_frame.pack(fill="x", pady=(0, 40))
        stats_frame.grid_columnconfigure((0, 1, 2), weight=1)

        data = [
            ("Pending Orders", "14", Theme.CLR_PRIMARY, "Requires Action"),
            ("Printer Status", "Online", Theme.CLR_SUCCESS, "Ready to Print"),
            ("Cloud Sync", "Synced", Theme.CLR_SUCCESS, "Last: 2m ago")
        ]
        
        for i, (t, v, color, sub) in enumerate(data):
            card = self.create_card(stats_frame)
            card.grid(row=0, column=i, padx=(0 if i==0 else 15, 15 if i==2 else 0), sticky="nsew")
            
            ctk.CTkLabel(card, text=t, font=Theme.FONTS["body_bold"], text_color=Theme.CLR_TEXT_SEC).pack(pady=(25, 5), padx=25, anchor="w")
            ctk.CTkLabel(card, text=v, font=Theme.FONTS["h1"], text_color=color).pack(padx=25, anchor="w")
            ctk.CTkLabel(card, text=sub, font=Theme.FONTS["small"], text_color=Theme.CLR_TEXT_SEC).pack(pady=(5, 25), padx=25, anchor="w")

        # QUEUE SECTION
        queue_header = ctk.CTkFrame(self, fg_color="transparent")
        queue_header.pack(fill="x", pady=(0, 20))
        
        ctk.CTkLabel(queue_header, text="Current Print Queue", font=Theme.FONTS["h2"], text_color=Theme.CLR_TEXT_MAIN).pack(side="left")
        ctk.CTkLabel(queue_header, text="3 active members", font=Theme.FONTS["small"], text_color=Theme.CLR_TEXT_SEC).pack(side="left", padx=15, pady=(5,0))

        queue_members = [
            {"name": "Aditya Verma", "id": "#ORD-9928", "file": "Budget_Draft.pdf", "pages": "12 pgs", "status": "In Progress", "clr": Theme.CLR_PRIMARY},
            {"name": "Sneha Kapoor", "id": "#ORD-9930", "file": "Invoice_V2.png", "pages": "1 pg", "status": "Pending", "clr": "#F59E0B"},
            {"name": "Rohan Das", "id": "#ORD-9931", "file": "Lecture_Notes.docx", "pages": "45 pgs", "status": "Ready", "clr": Theme.CLR_SUCCESS}
        ]

        for member in queue_members:
            m_card = self.create_card(self)
            m_card.pack(fill="x", pady=(0, 15))
            
            m_inner = ctk.CTkFrame(m_card, fg_color="transparent")
            m_inner.pack(fill="both", expand=True, padx=25, pady=20)
            
            info_frame = ctk.CTkFrame(m_inner, fg_color="transparent")
            info_frame.pack(side="left", fill="both")
            ctk.CTkLabel(info_frame, text=member["name"], font=Theme.FONTS["body_bold"], text_color=Theme.CLR_TEXT_MAIN).pack(anchor="w")
            ctk.CTkLabel(info_frame, text=member["id"], font=Theme.FONTS["small"], text_color=Theme.CLR_TEXT_SEC).pack(anchor="w")
            
            file_frame = ctk.CTkFrame(m_inner, fg_color="transparent")
            file_frame.pack(side="left", fill="both", padx=60)
            ctk.CTkLabel(file_frame, text=member["file"], font=Theme.FONTS["body"], text_color=Theme.CLR_TEXT_MAIN).pack(anchor="w")
            ctk.CTkLabel(file_frame, text=member["pages"], font=Theme.FONTS["small"], text_color=Theme.CLR_TEXT_SEC).pack(anchor="w")

            actions_frame = ctk.CTkFrame(m_inner, fg_color="transparent")
            actions_frame.pack(side="right", fill="y")
            
            status_box = ctk.CTkFrame(actions_frame, fg_color="#F8FAFC", corner_radius=6, border_width=1, border_color="#E2E8F0")
            status_box.pack(side="left", padx=20)
            ctk.CTkLabel(status_box, text=member["status"], font=Theme.FONTS["small"], text_color=member["clr"], padx=10, pady=2).pack()
            
            ctk.CTkButton(actions_frame, text="View Details", width=100, height=32, font=Theme.FONTS["small"], 
                          fg_color="transparent", border_width=1, border_color=Theme.CLR_BORDER, 
                          text_color=Theme.CLR_TEXT_MAIN, hover_color="#F8FAFC").pack(side="right")

    def create_card(self, parent, **kwargs):
        return ctk.CTkFrame(parent, fg_color="#FFFFFF", border_width=1, border_color=Theme.CLR_BORDER, corner_radius=12, **kwargs)
