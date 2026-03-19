import customtkinter as ctk
from frontend.theme import Theme


class ConfirmDialog(ctk.CTkToplevel):
    """A modern confirmation dialog with confirm/cancel actions."""

    def __init__(
        self,
        title="Confirm Action",
        message="Are you sure?",
        confirm_text="Confirm",
        cancel_text="Cancel",
        icon="warning",
        on_confirm=None,
        on_cancel=None,
        **kwargs,
    ):
        super().__init__(**kwargs)

        self.result = False
        self.on_confirm = on_confirm
        self.on_cancel = on_cancel

        self.title("")
        self.geometry("460x260")
        self.resizable(False, False)
        self.configure(fg_color="#FFFFFF")

        # Center the dialog
        self.update_idletasks()
        screen_w = self.winfo_screenwidth()
        screen_h = self.winfo_screenheight()
        x = (screen_w // 2) - (460 // 2)
        y = (screen_h // 2) - (260 // 2)
        self.geometry(f"+{x}+{y}")

        self.attributes("-topmost", True)
        self.grab_set()

        # Color scheme based on icon type
        colors = {
            "warning": {"accent": "#F59E0B", "bg_light": "#FFFBEB", "icon": "⚠️"},
            "danger": {"accent": "#DC2626", "bg_light": "#FEF2F2", "icon": "🗑️"},
            "info": {"accent": "#2563EB", "bg_light": "#EFF6FF", "icon": "ℹ️"},
        }
        scheme = colors.get(icon, colors["warning"])

        # Header accent bar
        ctk.CTkFrame(self, height=4, fg_color=scheme["accent"]).pack(fill="x")

        container = ctk.CTkFrame(self, fg_color="transparent")
        container.pack(fill="both", expand=True, padx=30, pady=20)

        # Icon + Title row
        title_frame = ctk.CTkFrame(container, fg_color="transparent")
        title_frame.pack(fill="x", pady=(0, 5))

        icon_label = ctk.CTkLabel(
            title_frame,
            text=scheme["icon"],
            font=("Segoe UI", 22),
            text_color=scheme["accent"],
        )
        icon_label.pack(side="left", padx=(0, 10))

        ctk.CTkLabel(
            title_frame,
            text=title,
            font=Theme.FONTS["h2"],
            text_color=Theme.CLR_TEXT_MAIN,
        ).pack(side="left")

        # Message
        msg_label = ctk.CTkLabel(
            container,
            text=message,
            font=Theme.FONTS["body"],
            text_color=Theme.CLR_TEXT_SEC,
            wraplength=400,
            justify="left",
        )
        msg_label.pack(anchor="w", pady=(10, 25))

        # Buttons
        btn_frame = ctk.CTkFrame(container, fg_color="transparent")
        btn_frame.pack(fill="x")

        # Cancel button
        cancel_btn = ctk.CTkButton(
            btn_frame,
            text=cancel_text,
            height=42,
            width=130,
            font=Theme.FONTS["body_bold"],
            fg_color="transparent",
            border_width=1,
            border_color=Theme.CLR_BORDER,
            text_color=Theme.CLR_TEXT_MAIN,
            hover_color="#F1F5F9",
            command=self._on_cancel,
        )
        cancel_btn.pack(side="right", padx=(10, 0))

        # Confirm button with danger color
        confirm_btn = ctk.CTkButton(
            btn_frame,
            text=confirm_text,
            height=42,
            width=160,
            font=Theme.FONTS["body_bold"],
            fg_color=scheme["accent"],
            hover_color=self._darken_color(scheme["accent"]),
            text_color="#FFFFFF",
            command=self._on_confirm,
        )
        confirm_btn.pack(side="right")

        # Handle window close
        self.protocol("WM_DELETE_WINDOW", self._on_cancel)

    def _on_confirm(self):
        self.result = True
        if self.on_confirm:
            self.on_confirm()
        self.destroy()

    def _on_cancel(self):
        self.result = False
        if self.on_cancel:
            self.on_cancel()
        self.destroy()

    def _darken_color(self, hex_color):
        """Simple hex color darkening."""
        hex_color = hex_color.lstrip("#")
        r, g, b = int(hex_color[:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
        factor = 0.8
        r, g, b = int(r * factor), int(g * factor), int(b * factor)
        return f"#{r:02x}{g:02x}{b:02x}"


def show_confirm_dialog(
    title="Confirm",
    message="Are you sure?",
    confirm_text="Confirm",
    cancel_text="Cancel",
    icon="warning",
    on_confirm=None,
    on_cancel=None,
):
    """Convenience function to show a confirmation dialog."""
    dialog = ConfirmDialog(
        title=title,
        message=message,
        confirm_text=confirm_text,
        cancel_text=cancel_text,
        icon=icon,
        on_confirm=on_confirm,
        on_cancel=on_cancel,
    )
    return dialog
