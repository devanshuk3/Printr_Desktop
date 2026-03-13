import customtkinter as ctk
from frontend.theme import Theme

class ModernDialog(ctk.CTkToplevel):
    def __init__(self, title, message, icon="info", ok_command=None, **kwargs):
        super().__init__(**kwargs)
        
        self.title("")
        self.geometry("400x200")
        self.resizable(False, False)
        self.configure(fg_color="#FFFFFF")
        
        # Center the dialog
        self.update_idletasks()
        screen_width = self.winfo_screenwidth()
        screen_height = self.winfo_screenheight()
        x = (screen_width // 2) - (400 // 2)
        y = (screen_height // 2) - (200 // 2)
        self.geometry(f"+{x}+{y}")
        
        # Make it stay on top
        self.attributes("-topmost", True)
        self.grab_set()

        # Styles based on type
        colors = {
            "info": Theme.CLR_PRIMARY,
            "error": Theme.CLR_DANGER,
            "warning": "#F59E0B"
        }
        accent = colors.get(icon, Theme.CLR_PRIMARY)

        # Header accent bar
        ctk.CTkFrame(self, height=4, fg_color=accent).pack(fill="x")
        
        container = ctk.CTkFrame(self, fg_color="transparent")
        container.pack(fill="both", expand=True, padx=30, pady=20)
        
        # Title
        ctk.CTkLabel(container, text=title, font=Theme.FONTS["h2"], text_color=Theme.CLR_TEXT_MAIN).pack(anchor="w")
        
        # Message (wrapped)
        msg_label = ctk.CTkLabel(container, text=message, font=Theme.FONTS["body"], 
                                text_color=Theme.CLR_TEXT_SEC, wraplength=340, justify="left")
        msg_label.pack(anchor="w", pady=(10, 20))
        
        # Button
        btn = ctk.CTkButton(container, text="OK", height=40, font=Theme.FONTS["body_bold"],
                           fg_color=accent, hover_color=accent, command=self.close)
        btn.pack(side="right")
        
        self.ok_command = ok_command

    def close(self):
        if self.ok_command:
            self.ok_command()
        self.destroy()

def show_modern_message(title, message, icon="info", ok_command=None):
    ModernDialog(title=title, message=message, icon=icon, ok_command=ok_command)
