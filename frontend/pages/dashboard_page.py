import customtkinter as ctk
from frontend.theme import Theme
from frontend.api_client import APIClient

class DashboardPage(ctk.CTkFrame):
    def __init__(self, parent, controller, **kwargs):
        super().__init__(parent, fg_color="transparent", **kwargs)
        self.controller = controller
        self.vendor_id = getattr(controller, 'current_vendor_id', None)

        if self.vendor_id:
            # Fetch actual data from API
            stats_data = APIClient.get_dashboard_stats(self.vendor_id)
            stats = stats_data.get("stats", {}) if stats_data.get("success") else {}
            
            queue_data = APIClient.get_print_queue(self.vendor_id)
            active_queue = queue_data.get("queue", []) if queue_data.get("success") else []
        else:
            stats = {}
            active_queue = []

        # Stats Grid
        stats_frame = ctk.CTkFrame(self, fg_color="transparent")
        stats_frame.pack(fill="x", pady=(0, 40))
        stats_frame.grid_columnconfigure((0, 1, 2), weight=1)

        printer_status = stats.get("printer_status", "Online")
        status_color = Theme.CLR_SUCCESS if printer_status == "Online" else Theme.CLR_DANGER
        
        display_stats = [
            ("Pending Orders", str(stats.get("pending_orders", 0)), Theme.CLR_PRIMARY, "Requires Action"),
            ("Printer Status", printer_status, status_color, "Verified" if printer_status == "Online" else "Check Connection"),
            ("Cloud Sync", "Synced", Theme.CLR_SUCCESS, f"Last: {stats.get('last_synced', 'Just now')}")
        ]
        
        for i, (t, v, color, sub) in enumerate(display_stats):
            card = self.create_card(stats_frame)
            card.grid(row=0, column=i, padx=(0 if i==0 else 15, 15 if i==2 else 0), sticky="nsew")
            
            ctk.CTkLabel(card, text=t, font=Theme.FONTS["body_bold"], text_color=Theme.CLR_TEXT_SEC).pack(pady=(25, 5), padx=25, anchor="w")
            ctk.CTkLabel(card, text=v, font=Theme.FONTS["h1"], text_color=color).pack(padx=25, anchor="w")
            ctk.CTkLabel(card, text=sub, font=Theme.FONTS["small"], text_color=Theme.CLR_TEXT_SEC).pack(pady=(5, 25), padx=25, anchor="w")

        # QUEUE SECTION
        queue_header = ctk.CTkFrame(self, fg_color="transparent")
        queue_header.pack(fill="x", pady=(0, 20))
        
        ctk.CTkLabel(queue_header, text="Current Print Queue", font=Theme.FONTS["h2"], text_color=Theme.CLR_TEXT_MAIN).pack(side="left")
        ctk.CTkLabel(queue_header, text=f"{len(active_queue)} active orders", font=Theme.FONTS["small"], text_color=Theme.CLR_TEXT_SEC).pack(side="left", padx=15, pady=(5,0))

        # Status Colors Mapping
        status_colors = {
            "In Progress": Theme.CLR_PRIMARY,
            "Pending": "#F59E0B",
            "Ready": Theme.CLR_SUCCESS,
            "Completed": Theme.CLR_TEXT_SEC
        }

        for item in active_queue:
            m_card = self.create_card(self)
            m_card.pack(fill="x", pady=(0, 15))
            
            m_inner = ctk.CTkFrame(m_card, fg_color="transparent")
            m_inner.pack(fill="both", expand=True, padx=25, pady=20)
            
            info_frame = ctk.CTkFrame(m_inner, fg_color="transparent")
            info_frame.pack(side="left", fill="both")
            ctk.CTkLabel(info_frame, text=item["member_name"], font=Theme.FONTS["body_bold"], text_color=Theme.CLR_TEXT_MAIN).pack(anchor="w")
            ctk.CTkLabel(info_frame, text=item["order_number"], font=Theme.FONTS["small"], text_color=Theme.CLR_TEXT_SEC).pack(anchor="w")
            
            file_frame = ctk.CTkFrame(m_inner, fg_color="transparent")
            file_frame.pack(side="left", fill="both", padx=60)
            ctk.CTkLabel(file_frame, text=item["file_name"], font=Theme.FONTS["body"], text_color=Theme.CLR_TEXT_MAIN).pack(anchor="w")
            ctk.CTkLabel(file_frame, text=f"{item['page_count']} pgs", font=Theme.FONTS["small"], text_color=Theme.CLR_TEXT_SEC).pack(anchor="w")

            actions_frame = ctk.CTkFrame(m_inner, fg_color="transparent")
            actions_frame.pack(side="right", fill="y")
            
            status_box = ctk.CTkFrame(actions_frame, fg_color="#F8FAFC", corner_radius=6, border_width=1, border_color="#E2E8F0")
            status_box.pack(side="left", padx=20)
            
            s_text = item["status"]
            s_clr = status_colors.get(s_text, Theme.CLR_TEXT_SEC)
            ctk.CTkLabel(status_box, text=s_text, font=Theme.FONTS["small"], text_color=s_clr, padx=10, pady=2).pack()
            
            ctk.CTkButton(actions_frame, text="View Details", width=100, height=32, font=Theme.FONTS["small"], 
                          fg_color="transparent", border_width=1, border_color=Theme.CLR_BORDER, 
                          text_color=Theme.CLR_TEXT_MAIN, hover_color="#EDF2F7").pack(side="right")

    def create_card(self, parent, **kwargs):
        return ctk.CTkFrame(parent, fg_color="#FFFFFF", border_width=1, border_color=Theme.CLR_BORDER, corner_radius=12, **kwargs)
