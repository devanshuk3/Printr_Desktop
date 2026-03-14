import customtkinter as ctk
from PIL import Image
from frontend.api_client import APIClient
from frontend.theme import Theme
from frontend.components.modern_dialog import show_modern_message

class LoginPage(ctk.CTkFrame):
    def __init__(self, parent, controller, **kwargs):
        super().__init__(parent, fg_color="#FFFFFF", corner_radius=20, border_width=1, border_color=Theme.CLR_BORDER, **kwargs)
        self.controller = controller
        
        # Split layout for login: Left (Branding) and Right (Form)
        self.pack_propagate(False)

        # Right Side: Form
        form_frame = ctk.CTkFrame(self, fg_color="transparent")
        form_frame.pack(side="right", fill="both", expand=True, padx=60)

        ctk.CTkLabel(form_frame, text="Welcome Back", font=Theme.FONTS["h1"], text_color=Theme.CLR_TEXT_MAIN).pack(pady=(60, 10), anchor="w")
        ctk.CTkLabel(form_frame, text="Enter your credentials to access the system", font=Theme.FONTS["body"], text_color=Theme.CLR_TEXT_SEC).pack(pady=(0, 40), anchor="w")

        # Inputs
        ctk.CTkLabel(form_frame, text="Vendor ID", font=Theme.FONTS["body_bold"], text_color=Theme.CLR_TEXT_MAIN).pack(anchor="w")
        self.v_id = ctk.CTkEntry(form_frame, height=45, placeholder_text="Enter Vendor ID", 
                                 fg_color=Theme.CLR_INPUT_BG, border_color=Theme.CLR_BORDER, 
                                 text_color=Theme.CLR_INPUT_TEXT, placeholder_text_color=Theme.CLR_TEXT_SEC)
        self.v_id.pack(fill="x", pady=(8, 20))
        self.v_id.bind("<Return>", self.handle_login)

        ctk.CTkLabel(form_frame, text="Password", font=Theme.FONTS["body_bold"], text_color=Theme.CLR_TEXT_MAIN).pack(anchor="w")
        self.v_pw = ctk.CTkEntry(form_frame, height=45, placeholder_text="Enter Password", show="*", 
                                 fg_color=Theme.CLR_INPUT_BG, border_color=Theme.CLR_BORDER, 
                                 text_color=Theme.CLR_INPUT_TEXT, placeholder_text_color=Theme.CLR_TEXT_SEC)
        self.v_pw.pack(fill="x", pady=(8, 35))
        self.v_pw.bind("<Return>", self.handle_login)

        self.signin_btn = ctk.CTkButton(form_frame, text="Sign In", height=50, font=Theme.FONTS["body_bold"], 
                      fg_color=Theme.CLR_PRIMARY, hover_color="#1D4ED8", 
                      command=self.handle_login)
        self.signin_btn.pack(fill="x", pady=(0, 15))

        ctk.CTkButton(form_frame, text="New Vendor? Register Here", height=40, font=Theme.FONTS["small"], 
                      fg_color="transparent", text_color=Theme.CLR_TEXT_SEC, hover_color="#F1F5F9", 
                      command=lambda: controller.show_page("registration")).pack(fill="x")

        # Left Side: Branding
        brand_frame = ctk.CTkFrame(self, fg_color=Theme.CLR_PRIMARY, corner_radius=18)
        brand_frame.pack(side="left", fill="both", expand=True, padx=10, pady=10)
        brand_frame.pack_propagate(False)
        
        # Logo Image
        try:
            # Note: Path might need adjustment depending on final execution context
            original_img = Image.open(r"Printr_Logo_transparent_White.png")
            w, h = original_img.size
            aspect_ratio = w / h
            new_width = 200
            new_height = int(new_width / aspect_ratio)
            
            self.logo_img = ctk.CTkImage(light_image=original_img, dark_image=original_img, size=(new_width, new_height))
            logo_label = ctk.CTkLabel(brand_frame, image=self.logo_img, text="")
            logo_label.place(relx=0.5, rely=0.45, anchor="center")
        except Exception as e:
            ctk.CTkLabel(brand_frame, text="PRINTR", font=Theme.FONTS["logo"], text_color="#FFFFFF").place(relx=0.5, rely=0.4, anchor="center")
            ctk.CTkLabel(brand_frame, text="Professional Print Management", font=Theme.FONTS["body"], text_color="#E0E7FF").place(relx=0.5, rely=0.48, anchor="center")

    def handle_login(self, event=None):
        vendor_id = self.v_id.get()
        password = self.v_pw.get()
        if not vendor_id or not password:
            show_modern_message("Input Error", "Please enter both Vendor ID and Password", icon="warning")
            return
            
        # UI Feedback: Show loading state
        self.signin_btn.configure(state="disabled", text="Signing In...")
        self.update_idletasks() # Force UI update

        try:
            result = APIClient.login(vendor_id, password)
            if result.get("success"):
                self.controller.current_vendor_id = vendor_id
                self.controller.show_main_layout()
                self.controller.show_page("dashboard")
            else:
                show_modern_message("Auth Failed", result.get("message", "Invalid Vendor ID or Password"), icon="error")
        finally:
            # Re-enable button
            self.signin_btn.configure(state="normal", text="Sign In")
