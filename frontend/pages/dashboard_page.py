import customtkinter as ctk
import threading
import os
import subprocess
import platform
from frontend.theme import Theme
from frontend.api_client import APIClient
from backend.r2_storage import list_vendor_files, download_file_to_temp, delete_file as r2_delete_file
from frontend.components.confirm_dialog import show_confirm_dialog
from frontend.components.modern_dialog import show_modern_message

class DashboardPage(ctk.CTkFrame):
    def __init__(self, parent, controller, **kwargs):
        super().__init__(parent, fg_color="transparent", **kwargs)
        self.controller = controller
        self.vendor_id = getattr(controller, 'current_vendor_id', None)
        self.files = []
        self.file_cards = {}

        # 1. Stats Grid (Top)
        self.stats_container = ctk.CTkFrame(self, fg_color="transparent")
        self.stats_container.pack(fill="x", pady=(0, 40))
        self._load_stats()

        # 2. Cloud Print Queue Header
        queue_header = ctk.CTkFrame(self, fg_color="transparent")
        queue_header.pack(fill="x", pady=(0, 20))
        
        ctk.CTkLabel(queue_header, text="Live Print Queue", font=Theme.FONTS["h2"], text_color=Theme.CLR_TEXT_MAIN).pack(side="left")
        
        self.file_count_label = ctk.CTkLabel(queue_header, text="Fetching jobs...", font=Theme.FONTS["small"], text_color=Theme.CLR_TEXT_SEC)
        self.file_count_label.pack(side="left", padx=15, pady=(5,0))

        # Refresh button
        self.refresh_btn = ctk.CTkButton(queue_header, text="↻ Refresh", width=100, height=32, font=Theme.FONTS["small"], 
                                       fg_color=Theme.CLR_PRIMARY, hover_color="#1D4ED8", command=self._refresh_queue)
        self.refresh_btn.pack(side="right")

        # 3. Queue Content Area
        self.queue_container = ctk.CTkFrame(self, fg_color="transparent")
        self.queue_container.pack(fill="both", expand=True)

        if self.vendor_id:
            self._start_fetching_queue()

    def _load_stats(self):
        """Fetch and display summary stats."""
        for widget in self.stats_container.winfo_children():
            widget.destroy()

        if self.vendor_id:
            stats_data = APIClient.get_dashboard_stats(self.vendor_id)
            stats = stats_data.get("stats", {}) if stats_data.get("success") else {}
        else:
            stats = {}

        self.stats_container.grid_columnconfigure((0, 1, 2), weight=1)

        printer_status = stats.get("printer_status", "Online")
        status_color = Theme.CLR_SUCCESS if printer_status == "Online" else Theme.CLR_DANGER
        
        display_stats = [
            ("Pending Jobs", "...", Theme.CLR_PRIMARY, "From Cloud"),
            ("Printer Status", printer_status, status_color, "Ready" if printer_status == "Online" else "Disconnected"),
            ("Cloud Sync", "Active", Theme.CLR_SUCCESS, f"Last: {stats.get('last_synced', 'Just now')}")
        ]
        
        self.stat_labels = []
        for i, (t, v, color, sub) in enumerate(display_stats):
            card = self.create_card(self.stats_container)
            card.grid(row=0, column=i, padx=(0 if i==0 else 15, 15 if i==2 else 0), sticky="nsew")
            
            ctk.CTkLabel(card, text=t, font=Theme.FONTS["body_bold"], text_color=Theme.CLR_TEXT_SEC).pack(pady=(25, 5), padx=25, anchor="w")
            val_label = ctk.CTkLabel(card, text=v, font=Theme.FONTS["h1"], text_color=color)
            val_label.pack(padx=25, anchor="w")
            self.stat_labels.append(val_label)
            ctk.CTkLabel(card, text=sub, font=Theme.FONTS["small"], text_color=Theme.CLR_TEXT_SEC).pack(pady=(5, 25), padx=25, anchor="w")

    def _start_fetching_queue(self):
        """Fetch files from R2 in background."""
        thread = threading.Thread(target=self._fetch_r2_files, daemon=True)
        thread.start()

    def _fetch_r2_files(self):
        try:
            files = list_vendor_files(self.vendor_id)
            self.after(0, self._render_queue, files)
        except Exception as e:
            print(f"Error fetching queue: {e}")
            self.after(0, lambda: self.file_count_label.configure(text="Storage Connect Error"))

    def _render_queue(self, files):
        self.files = files
        self.file_count_label.configure(text=f"{len(files)} jobs waiting")
        
        if hasattr(self, 'stat_labels') and len(self.stat_labels) > 0:
            self.stat_labels[0].configure(text=str(len(files)))

        for widget in self.queue_container.winfo_children():
            widget.destroy()
        self.file_cards.clear()

        if not files:
            self._render_empty_state()
            return

        for idx, file_info in enumerate(files):
            card = self._create_queue_card(self.queue_container, file_info)
            card.pack(fill="x", pady=(0, 10))
            self.file_cards[file_info["key"]] = card

    def _render_empty_state(self):
        card = self.create_card(self.queue_container)
        card.pack(fill="x", pady=20)
        ctk.CTkLabel(card, text="Excellent! All caught up. No pending print jobs.", font=Theme.FONTS["body"], text_color=Theme.CLR_TEXT_SEC).pack(pady=40)

    def _create_queue_card(self, parent, file_info):
        card = self.create_card(parent)
        inner = ctk.CTkFrame(card, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=20, pady=15)

        # ── Left: User Info ──
        info_frame = ctk.CTkFrame(inner, fg_color="transparent")
        info_frame.pack(side="left", fill="both", expand=True)
        
        # Sender Name
        name = file_info.get("sender_name", "Guest User")
        ctk.CTkLabel(info_frame, text=name, font=Theme.FONTS["body_bold"], text_color=Theme.CLR_TEXT_MAIN).pack(anchor="w")
        
        # Sender UPI
        upi = file_info.get("sender_upi", "No UPI Info")
        ctk.CTkLabel(info_frame, text=f"ID: {upi}", font=Theme.FONTS["small"], text_color=Theme.CLR_TEXT_SEC).pack(anchor="w")
        
        # ── Middle: Page Count & File Tag ──
        meta_frame = ctk.CTkFrame(inner, fg_color="transparent")
        meta_frame.pack(side="left", fill="both", padx=20)
        
        pages = file_info.get("page_count", "N/A")
        pg_badge = ctk.CTkFrame(meta_frame, fg_color="#F1F5F9", corner_radius=6)
        pg_badge.pack(pady=2)
        ctk.CTkLabel(pg_badge, text=f" {pages} Pages ", font=Theme.FONTS["body_bold"], text_color=Theme.CLR_PRIMARY).pack(padx=8, pady=4)

        # ── Right: Action Buttons ──
        actions_frame = ctk.CTkFrame(inner, fg_color="transparent")
        actions_frame.pack(side="right", fill="y")

        # View Button
        ctk.CTkButton(actions_frame, text="👁 View", width=80, height=34, font=Theme.FONTS["small"], 
                      fg_color="transparent", border_width=1, border_color=Theme.CLR_BORDER, 
                      text_color=Theme.CLR_TEXT_MAIN, hover_color="#F8FAFC",
                      command=lambda f=file_info: self._handle_view(f)).pack(side="left", padx=5)

        # Print Button
        ctk.CTkButton(actions_frame, text="🖨️ Print", width=80, height=34, font=Theme.FONTS["small"], 
                      fg_color=Theme.CLR_PRIMARY, hover_color="#1D4ED8", 
                      command=lambda f=file_info: self._handle_print(f)).pack(side="left", padx=5)

        # Cancel Button (Delete)
        ctk.CTkButton(actions_frame, text="✕", width=34, height=34, font=Theme.FONTS["small"], 
                      fg_color="transparent", border_width=1, border_color=Theme.CLR_DANGER, 
                      text_color=Theme.CLR_DANGER, hover_color="#FEF2F2",
                      command=lambda f=file_info: self._handle_cancel(f)).pack(side="left", padx=5)

        return card

    def _handle_view(self, file_info):
        """View the file without explicitly marking it for print."""
        self._download_and_open_file(file_info, "Opening file preview...")

    def _handle_print(self, file_info):
        """Open the file for printing."""
        self._download_and_open_file(file_info, f"Sending '{file_info.get('sender_name')}''s job to printer...")

    def _download_and_open_file(self, file_info, message):
        show_modern_message("Cloud Sync", message)
        
        def task():
            temp_path = download_file_to_temp(file_info["key"])
            if temp_path:
                self._open_file(temp_path)
            else:
                self.after(0, lambda: show_modern_message("Error", "Could not fetch file from cloud storage.", icon="error"))

        threading.Thread(target=task, daemon=True).start()

    def _open_file(self, path):
        try:
            system = platform.system()
            if system == "Linux": subprocess.Popen(["xdg-open", path])
            elif system == "Darwin": subprocess.Popen(["open", path])
            elif system == "Windows": os.startfile(path)
        except Exception as e:
            print(f"Error opening file: {e}")

    def _handle_cancel(self, file_info):
        sender = file_info.get("sender_name", "this user")
        def confirmed():
            self._delete_file(file_info["key"])

        show_confirm_dialog(
            title="Cancel Order?", 
            message=f"Remove the print job from {sender}?\nThis will delete the file from the cloud forever.",
            icon="danger",
            confirm_text="Yes, Remove Job",
            on_confirm=confirmed
        )

    def _delete_file(self, key):
        def task():
            if r2_delete_file(key):
                self.after(0, self._refresh_queue)
            else:
                self.after(0, lambda: show_modern_message("Error", "Failed to delete file from cloud.", icon="error"))
        
        threading.Thread(target=task, daemon=True).start()

    def _refresh_queue(self):
        self.file_count_label.configure(text="Syncing...")
        self._start_fetching_queue()

    def create_card(self, parent, **kwargs):
        return ctk.CTkFrame(parent, fg_color="#FFFFFF", border_width=1, border_color=Theme.CLR_BORDER, corner_radius=12, **kwargs)
