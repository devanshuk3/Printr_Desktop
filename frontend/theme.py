import customtkinter as ctk
ctk.set_appearance_mode("light")

class Theme:
    CLR_BG = "#F8F9FC"
    CLR_SIDEBAR = "#FFFFFF"
    CLR_HEADER = "#FFFFFF"
    CLR_PRIMARY = "#2563EB"
    CLR_DANGER = "#DC2626"
    CLR_SUCCESS = "#16A34A"
    CLR_TEXT_MAIN = "#1E293B"
    CLR_TEXT_SEC = "#64748B"
    CLR_BORDER = "#E2E8F0"
    CLR_INPUT_BG = "#FFFFFF" # Pure white for inputs
    CLR_INPUT_TEXT = "#1E293B"

    FONTS = {
        "h1": ("Segoe UI", 28, "bold"),
        "h2": ("Segoe UI", 20, "bold"),
        "body_bold": ("Segoe UI", 14, "bold"),
        "body": ("Segoe UI", 14),
        "small": ("Segoe UI", 12),
        "logo": ("Segoe UI", 24, "bold")
    }
