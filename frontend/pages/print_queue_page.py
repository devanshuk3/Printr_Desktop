import customtkinter as ctk
import threading
import os
import subprocess
import platform
from frontend.theme import Theme
from backend.r2_storage import list_vendor_files, get_file_download_url, download_file_to_temp, delete_file as r2_delete_file
from frontend.components.confirm_dialog import show_confirm_dialog
from frontend.components.modern_dialog import show_modern_message


class PrintQueuePage(ctk.CTkFrame):
    """
    Print Queue page that fetches files from Cloudflare R2 storage
    based on the vendor ID and displays them as actionable order cards.
    """

    def __init__(self, parent, controller, **kwargs):
        super().__init__(parent, fg_color="transparent", **kwargs)
        self.controller = controller
        self.vendor_id = getattr(controller, "current_vendor_id", None)
        self.files = []
        self.file_cards = {}  # Track cards by file key for updates

        # Build the skeleton UI immediately
        self._build_header()
        self._build_loading_state()

        # Fetch files from R2 in a background thread
        if self.vendor_id:
            self._start_loading()

    def _build_header(self):
        """Build the page header with title and refresh button."""
        header_frame = ctk.CTkFrame(self, fg_color="transparent")
        header_frame.pack(fill="x", pady=(0, 20))

        left = ctk.CTkFrame(header_frame, fg_color="transparent")
        left.pack(side="left", fill="x", expand=True)

        ctk.CTkLabel(
            left,
            text="☁️  Cloud Print Queue",
            font=Theme.FONTS["h2"],
            text_color=Theme.CLR_TEXT_MAIN,
        ).pack(side="left")

        self.file_count_label = ctk.CTkLabel(
            left,
            text="Loading...",
            font=Theme.FONTS["small"],
            text_color=Theme.CLR_TEXT_SEC,
        )
        self.file_count_label.pack(side="left", padx=15, pady=(5, 0))

        # Refresh button
        refresh_btn = ctk.CTkButton(
            header_frame,
            text="↻ Refresh",
            width=110,
            height=36,
            font=Theme.FONTS["body_bold"],
            fg_color=Theme.CLR_PRIMARY,
            hover_color="#1D4ED8",
            command=self._refresh_files,
        )
        refresh_btn.pack(side="right")

    def _build_loading_state(self):
        """Show a loading indicator."""
        self.content_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.content_frame.pack(fill="both", expand=True)

        self.loading_frame = ctk.CTkFrame(self.content_frame, fg_color="transparent")
        self.loading_frame.pack(fill="both", expand=True, pady=80)

        ctk.CTkLabel(
            self.loading_frame,
            text="🔄",
            font=("Segoe UI", 40),
        ).pack(pady=(0, 15))
        ctk.CTkLabel(
            self.loading_frame,
            text="Fetching files from cloud storage...",
            font=Theme.FONTS["body"],
            text_color=Theme.CLR_TEXT_SEC,
        ).pack()

    def _start_loading(self):
        """Start fetching files in background thread."""
        thread = threading.Thread(target=self._fetch_files, daemon=True)
        thread.start()

    def _fetch_files(self):
        """Fetch files from R2 directly (runs in background thread)."""
        try:
            files = list_vendor_files(self.vendor_id)
            result = {"success": True, "files": files}
        except Exception as e:
            print(f"Error fetching R2 files: {e}")
            result = {"success": False, "files": [], "message": str(e)}
        # Schedule UI update on the main thread
        self.after(0, self._on_files_loaded, result)

    def _on_files_loaded(self, result):
        """Handle the loaded files on the main thread."""
        # Clear loading state
        for widget in self.content_frame.winfo_children():
            widget.destroy()

        if result.get("success"):
            self.files = result.get("files", [])
        else:
            self.files = []

        self.file_count_label.configure(text=f"{len(self.files)} files found")

        if not self.files:
            self._build_empty_state()
        else:
            self._build_file_list()

    def _build_empty_state(self):
        """Show empty state when no files found."""
        empty_frame = ctk.CTkFrame(self.content_frame, fg_color="transparent")
        empty_frame.pack(fill="both", expand=True, pady=60)

        empty_card = self._create_card(empty_frame)
        empty_card.pack(fill="x", padx=40)

        inner = ctk.CTkFrame(empty_card, fg_color="transparent")
        inner.pack(padx=40, pady=50)

        ctk.CTkLabel(
            inner,
            text="📭",
            font=("Segoe UI", 48),
        ).pack(pady=(0, 15))

        ctk.CTkLabel(
            inner,
            text="No Files in Queue",
            font=Theme.FONTS["h2"],
            text_color=Theme.CLR_TEXT_MAIN,
        ).pack(pady=(0, 8))

        ctk.CTkLabel(
            inner,
            text=f"No files found for vendor '{self.vendor_id}'.\n"
                 "Files uploaded by customers will appear here.",
            font=Theme.FONTS["body"],
            text_color=Theme.CLR_TEXT_SEC,
            justify="center",
        ).pack()

    def _build_file_list(self):
        """Build the list of file order cards."""
        for idx, file_info in enumerate(self.files):
            card = self._create_file_card(self.content_frame, file_info, idx)
            card.pack(fill="x", pady=(0, 12))
            self.file_cards[file_info["key"]] = card

    def _create_file_card(self, parent, file_info, index):
        """Create a single file order card with action buttons."""
        card = self._create_card(parent)

        inner = ctk.CTkFrame(card, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=25, pady=18)

        # ── Left: File info ──
        info_frame = ctk.CTkFrame(inner, fg_color="transparent")
        info_frame.pack(side="left", fill="both", expand=True)

        # Row 1: File icon + name
        name_row = ctk.CTkFrame(info_frame, fg_color="transparent")
        name_row.pack(fill="x", anchor="w")

        file_icon = self._get_file_icon(file_info["file_name"])
        ctk.CTkLabel(
            name_row,
            text=file_icon,
            font=("Segoe UI", 18),
        ).pack(side="left", padx=(0, 8))

        ctk.CTkLabel(
            name_row,
            text=file_info["file_name"],
            font=Theme.FONTS["body_bold"],
            text_color=Theme.CLR_TEXT_MAIN,
        ).pack(side="left")

        # Row 2: File metadata
        meta_row = ctk.CTkFrame(info_frame, fg_color="transparent")
        meta_row.pack(fill="x", anchor="w", pady=(4, 0))

        # Size badge
        size_badge = ctk.CTkFrame(meta_row, fg_color="#EFF6FF", corner_radius=4)
        size_badge.pack(side="left", padx=(0, 8))
        ctk.CTkLabel(
            size_badge,
            text=f"  {file_info['size_display']}  ",
            font=Theme.FONTS["small"],
            text_color=Theme.CLR_PRIMARY,
        ).pack(padx=6, pady=2)

        # Subfolder / path info
        if file_info.get("subfolder"):
            folder_badge = ctk.CTkFrame(meta_row, fg_color="#F0FDF4", corner_radius=4)
            folder_badge.pack(side="left", padx=(0, 8))
            ctk.CTkLabel(
                folder_badge,
                text=f"  📁 {file_info['subfolder']}  ",
                font=Theme.FONTS["small"],
                text_color="#16A34A",
            ).pack(padx=6, pady=2)

        # Modified time
        ctk.CTkLabel(
            meta_row,
            text=f"Modified: {file_info.get('last_modified', 'N/A')[:16]}",
            font=Theme.FONTS["small"],
            text_color=Theme.CLR_TEXT_SEC,
        ).pack(side="left", padx=(8, 0))

        # ── Right: Action buttons ──
        actions_frame = ctk.CTkFrame(inner, fg_color="transparent")
        actions_frame.pack(side="right", fill="y")

        # Payment Verification Button
        verify_btn = ctk.CTkButton(
            actions_frame,
            text="✓ Verify Payment",
            width=140,
            height=36,
            font=Theme.FONTS["body_bold"],
            fg_color=Theme.CLR_SUCCESS,
            hover_color="#15803D",
            command=lambda f=file_info: self._verify_payment(f),
        )
        verify_btn.pack(side="left", padx=(0, 8))

        # Print Button
        print_btn = ctk.CTkButton(
            actions_frame,
            text="🖨️ Print",
            width=100,
            height=36,
            font=Theme.FONTS["body_bold"],
            fg_color=Theme.CLR_PRIMARY,
            hover_color="#1D4ED8",
            command=lambda f=file_info: self._print_file(f),
        )
        print_btn.pack(side="left", padx=(0, 8))

        # Cancel Order Button
        cancel_btn = ctk.CTkButton(
            actions_frame,
            text="✕ Cancel",
            width=100,
            height=36,
            font=Theme.FONTS["body_bold"],
            fg_color="transparent",
            border_width=1,
            border_color=Theme.CLR_DANGER,
            text_color=Theme.CLR_DANGER,
            hover_color="#FEF2F2",
            command=lambda f=file_info: self._cancel_order(f),
        )
        cancel_btn.pack(side="left")

        return card

    def _verify_payment(self, file_info):
        """Handle payment verification for an order."""
        file_name = file_info["file_name"]

        # Mark as verified visually
        card = self.file_cards.get(file_info["key"])
        if card:
            # Add a verified badge to the card
            verified_badge = ctk.CTkFrame(card, fg_color="#F0FDF4", corner_radius=6)
            verified_badge.place(relx=1.0, rely=0.0, anchor="ne", x=-15, y=8)
            ctk.CTkLabel(
                verified_badge,
                text="  ✅ Payment Verified  ",
                font=Theme.FONTS["small"],
                text_color="#16A34A",
            ).pack(padx=8, pady=4)

        show_modern_message(
            "Payment Verified",
            f"Payment for '{file_name}' has been successfully verified.\n"
            "You can now proceed to print this file.",
            icon="info",
        )

    def _print_file(self, file_info):
        """Download the file from R2 and open it for printing."""
        file_name = file_info["file_name"]
        file_key = file_info["key"]

        # Show downloading status
        show_modern_message(
            "Downloading File",
            f"Downloading '{file_name}' from cloud storage...\nThe file will open for printing automatically.",
            icon="info",
        )

        # Download in background thread
        thread = threading.Thread(
            target=self._download_and_print, args=(file_key, file_name), daemon=True
        )
        thread.start()

    def _download_and_print(self, file_key, file_name):
        """Download file from R2 directly and open with system print dialog."""
        try:
            temp_path = download_file_to_temp(file_key)
            if temp_path and os.path.exists(temp_path):
                # Open with the system's default application
                system = platform.system()
                if system == "Linux":
                    subprocess.Popen(["xdg-open", temp_path])
                elif system == "Darwin":
                    subprocess.Popen(["open", temp_path])
                elif system == "Windows":
                    os.startfile(temp_path)

                self.after(
                    0,
                    lambda: show_modern_message(
                        "File Ready",
                        f"'{file_name}' has been downloaded and opened.\n"
                        "Use your system's print dialog to print the file.",
                        icon="info",
                    ),
                )
            else:
                self.after(
                    0,
                    lambda: show_modern_message(
                        "Download Failed",
                        f"Could not download '{file_name}' from cloud storage.",
                        icon="error",
                    ),
                )
        except Exception as e:
            self.after(
                0,
                lambda: show_modern_message(
                    "Download Failed",
                    f"Could not download '{file_name}'.\nError: {str(e)}",
                    icon="error",
                ),
            )

    def _cancel_order(self, file_info):
        """Show a warning dialog before cancelling an order."""
        file_name = file_info["file_name"]
        file_key = file_info["key"]

        def on_confirm():
            # Delete the file from R2 in a background thread
            thread = threading.Thread(
                target=self._delete_file, args=(file_key, file_name), daemon=True
            )
            thread.start()

        show_confirm_dialog(
            title="Cancel Order?",
            message=(
                f"Are you sure you want to cancel the order for '{file_name}'?\n\n"
                "This will permanently delete the file from cloud storage. "
                "This action cannot be undone."
            ),
            confirm_text="Yes, Cancel Order",
            cancel_text="Keep Order",
            icon="danger",
            on_confirm=on_confirm,
        )

    def _delete_file(self, file_key, file_name):
        """Delete file from R2 directly and refresh the list."""
        try:
            success = r2_delete_file(file_key)
            if success:
                self.after(
                    0,
                    lambda: self._on_file_deleted(file_key, file_name),
                )
            else:
                self.after(
                    0,
                    lambda: show_modern_message(
                        "Delete Failed",
                        f"Could not delete '{file_name}' from cloud storage.",
                        icon="error",
                    ),
                )
        except Exception as e:
            self.after(
                0,
                lambda: show_modern_message(
                    "Delete Failed",
                    f"Could not delete '{file_name}'.\nError: {str(e)}",
                    icon="error",
                ),
            )

    def _on_file_deleted(self, file_key, file_name):
        """Handle successful file deletion on the main thread."""
        # Remove the card from UI
        card = self.file_cards.pop(file_key, None)
        if card:
            card.destroy()

        # Update file list
        self.files = [f for f in self.files if f["key"] != file_key]
        self.file_count_label.configure(text=f"{len(self.files)} files found")

        # Show empty state if no files left
        if not self.files:
            for widget in self.content_frame.winfo_children():
                widget.destroy()
            self._build_empty_state()

        show_modern_message(
            "Order Cancelled",
            f"'{file_name}' has been removed from the print queue.",
            icon="info",
        )

    def _refresh_files(self):
        """Refresh the file list."""
        # Clear current content
        for widget in self.content_frame.winfo_children():
            widget.destroy()
        self.file_cards.clear()

        self.file_count_label.configure(text="Loading...")

        # Show loading state
        self.loading_frame = ctk.CTkFrame(self.content_frame, fg_color="transparent")
        self.loading_frame.pack(fill="both", expand=True, pady=80)
        ctk.CTkLabel(
            self.loading_frame, text="🔄", font=("Segoe UI", 40)
        ).pack(pady=(0, 15))
        ctk.CTkLabel(
            self.loading_frame,
            text="Refreshing file list...",
            font=Theme.FONTS["body"],
            text_color=Theme.CLR_TEXT_SEC,
        ).pack()

        # Fetch again
        self._start_loading()

    def _get_file_icon(self, filename):
        """Return an appropriate icon based on file extension."""
        ext = os.path.splitext(filename)[1].lower()
        icons = {
            ".pdf": "📄",
            ".doc": "📝",
            ".docx": "📝",
            ".xls": "📊",
            ".xlsx": "📊",
            ".ppt": "📊",
            ".pptx": "📊",
            ".jpg": "🖼️",
            ".jpeg": "🖼️",
            ".png": "🖼️",
            ".gif": "🖼️",
            ".bmp": "🖼️",
            ".txt": "📃",
            ".csv": "📊",
            ".zip": "📦",
            ".rar": "📦",
        }
        return icons.get(ext, "📄")

    def _create_card(self, parent, **kwargs):
        """Create a styled card frame."""
        return ctk.CTkFrame(
            parent,
            fg_color="#FFFFFF",
            border_width=1,
            border_color=Theme.CLR_BORDER,
            corner_radius=12,
            **kwargs,
        )
