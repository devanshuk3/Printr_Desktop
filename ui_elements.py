import customtkinter as ctk
from PIL import Image
import requests
import io
import os

# Set system-wide styling
ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")

class EnterpriseApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Printr | Enterprise Management v2.0")
        self.geometry("1100x700")
        
        # --- Theme Tokens ---
        self.clr_bg = "#F8F9FC"
        self.clr_sidebar = "#FFFFFF"
        self.clr_header = "#FFFFFF"
        self.clr_primary = "#2563EB"  # Brighter, modern blue
        self.clr_danger = "#DC2626"
        self.clr_success = "#16A34A"
        self.clr_text_main = "#1E293B"
        self.clr_text_sec = "#64748B"
        self.clr_border = "#E2E8F0"
        
        self.fonts = {
            "h1": ("Segoe UI", 28, "bold"),
            "h2": ("Segoe UI", 20, "bold"),
            "body_bold": ("Segoe UI", 14, "bold"),
            "body": ("Segoe UI", 14),
            "small": ("Segoe UI", 12),
            "logo": ("Segoe UI", 24, "bold")
        }

        self.configure(fg_color=self.clr_bg)

        # State
        self.sidebar = None
        self.content_area = None
        self.header = None
        self.nav_buttons = {}
        
        self.show_login()

    def clear_screen(self):
        for widget in self.winfo_children():
            widget.destroy()

    # --- UI FACTORIES ---

    def create_card(self, parent, **kwargs):
        return ctk.CTkFrame(parent, fg_color="#FFFFFF", border_width=1, border_color=self.clr_border, corner_radius=12, **kwargs)

    def sidebar_button(self, parent, text, command):
        btn = ctk.CTkButton(
            parent, text=text, height=45, fg_color="transparent", 
            text_color=self.clr_text_main, anchor="w", font=self.fonts["body"],
            hover_color="#F1F5F9", corner_radius=8, command=command
        )
        btn.pack(fill="x", padx=10, pady=2)
        return btn

    # --- LAYOUT SETUP ---
    
    def setup_main_layout(self):
        """Creates the shell with sidebar, header, and content area."""
        self.clear_screen()
        
        # 1. Sidebar
        self.sidebar = ctk.CTkFrame(self, width=240, fg_color=self.clr_sidebar, corner_radius=0, border_width=0)
        self.sidebar.pack(side="left", fill="y")
        self.sidebar.pack_propagate(False)

        # Border for sidebar
        sidebar_border = ctk.CTkFrame(self, width=1, fg_color=self.clr_border)
        sidebar_border.pack(side="left", fill="y")

        logo_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        logo_frame.pack(pady=(40, 40), padx=20, fill="x")
        
        logo = ctk.CTkLabel(logo_frame, text="PRINTR", font=self.fonts["logo"], text_color=self.clr_primary)
        logo.pack(side="left")

        self.nav_buttons = {}
        menu_items = [
            ("Dashboard", self.view_dashboard),
            ("Printer Config", self.view_printer),
            ("COD Verification", self.view_cod),
            ("Razorpay Setup", self.view_razorpay_setup),
            ("System Logs", None)
        ]

        for text, cmd in menu_items:
            self.nav_buttons[text] = self.sidebar_button(self.sidebar, text, cmd)

        # Logout at bottom
        logout_btn = ctk.CTkButton(
            self.sidebar, text="Sign Out", height=40, fg_color="transparent", 
            text_color=self.clr_danger, font=self.fonts["body_bold"],
            hover_color="#FEF2F2", command=self.show_login
        )
        logout_btn.pack(side="bottom", fill="x", padx=10, pady=20)

        # 2. Main Content Wrapper
        main_wrapper = ctk.CTkFrame(self, fg_color="transparent")
        main_wrapper.pack(side="right", fill="both", expand=True)

        # 3. Top Header
        self.header = ctk.CTkFrame(main_wrapper, height=70, fg_color=self.clr_header, corner_radius=0)
        self.header.pack(side="top", fill="x")
        self.header.pack_propagate(False)
        
        header_border = ctk.CTkFrame(main_wrapper, height=1, fg_color=self.clr_border)
        header_border.pack(side="top", fill="x")

        self.header_title = ctk.CTkLabel(self.header, text="Dashboard", font=self.fonts["h2"], text_color=self.clr_text_main)
        self.header_title.pack(side="left", padx=30, pady=20)

        # 4. Content Stage
        self.content_area = ctk.CTkScrollableFrame(main_wrapper, fg_color="transparent", corner_radius=0)
        self.content_area.pack(fill="both", expand=True, padx=40, pady=30)

    def set_active_nav(self, name):
        for btn_name, btn in self.nav_buttons.items():
            if btn_name == name:
                btn.configure(fg_color=self.clr_primary, text_color="#FFFFFF", hover_color=self.clr_primary)
            else:
                btn.configure(fg_color="transparent", text_color=self.clr_text_main, hover_color="#F1F5F9")

    # --- VIEWS ---

    def show_login(self):
        self.clear_screen()
        
        # Split layout for login: Left (Branding) and Right (Form)
        login_container = ctk.CTkFrame(self, fg_color="#FFFFFF", corner_radius=20, border_width=1, border_color=self.clr_border, width=850, height=520)
        login_container.place(relx=0.5, rely=0.5, anchor="center")
        login_container.pack_propagate(False)

        # Right Side: Form
        form_frame = ctk.CTkFrame(login_container, fg_color="transparent")
        form_frame.pack(side="right", fill="both", expand=True, padx=60)

        ctk.CTkLabel(form_frame, text="Welcome Back", font=self.fonts["h1"], text_color=self.clr_text_main).pack(pady=(60, 10), anchor="w")
        ctk.CTkLabel(form_frame, text="Enter your credentials to access the system", font=self.fonts["body"], text_color=self.clr_text_sec).pack(pady=(0, 40), anchor="w")

        # Inputs
        ctk.CTkLabel(form_frame, text="Vendor ID", font=self.fonts["body_bold"], text_color=self.clr_text_main).pack(anchor="w")
        v_id = ctk.CTkEntry(form_frame, height=45, placeholder_text="Enter ID", fg_color="#F8FAFC", border_color=self.clr_border)
        v_id.pack(fill="x", pady=(8, 20))

        ctk.CTkLabel(form_frame, text="Password", font=self.fonts["body_bold"], text_color=self.clr_text_main).pack(anchor="w")
        v_pw = ctk.CTkEntry(form_frame, height=45, placeholder_text="••••••••", show="*", fg_color="#F8FAFC", border_color=self.clr_border)
        v_pw.pack(fill="x", pady=(8, 35))

        ctk.CTkButton(form_frame, text="Sign In", height=50, font=self.fonts["body_bold"], 
                      fg_color=self.clr_primary, hover_color="#1E40AF", command=self.view_dashboard).pack(fill="x", pady=(0, 15))

        # Switch to Razorpay
        ctk.CTkButton(form_frame, text="Authenticate with Razorpay", height=40, font=self.fonts["small"], 
                      fg_color="transparent", text_color=self.clr_primary, hover_color="#F1F5F9", 
                      command=self.show_razorpay_login).pack(fill="x")

        # Left Side: Branding
        brand_frame = ctk.CTkFrame(login_container, fg_color=self.clr_primary, corner_radius=18)
        brand_frame.pack(side="left", fill="both", expand=True, padx=10, pady=10)
        brand_frame.pack_propagate(False)
        
        # Logo Image
        try:
            original_img = Image.open(r"Printr_Logo_transparent_White.png")
            w, h = original_img.size
            aspect_ratio = w / h
            new_width = 200
            new_height = int(new_width / aspect_ratio)
            
            self.logo_img = ctk.CTkImage(light_image=original_img,
                                         dark_image=original_img,
                                         size=(new_width, new_height))
            logo_label = ctk.CTkLabel(brand_frame, image=self.logo_img, text="")
            logo_label.place(relx=0.5, rely=0.45, anchor="center")
        except Exception as e:
            # Fallback to text if image fails to load
            ctk.CTkLabel(brand_frame, text="PRINTR", font=self.fonts["logo"], text_color="#FFFFFF").place(relx=0.5, rely=0.4, anchor="center")
            ctk.CTkLabel(brand_frame, text="Professional Print Management", font=self.fonts["body"], text_color="#E0E7FF").place(relx=0.5, rely=0.48, anchor="center")
            print(f"Error loading logo: {e}")

    def show_razorpay_login(self):
        self.clear_screen()
        
        login_container = ctk.CTkFrame(self, fg_color="#FFFFFF", corner_radius=20, border_width=1, border_color=self.clr_border, width=850, height=520)
        login_container.place(relx=0.5, rely=0.5, anchor="center")
        login_container.pack_propagate(False)

        # Right Side: Razorpay Form
        form_frame = ctk.CTkFrame(login_container, fg_color="transparent")
        form_frame.pack(side="right", fill="both", expand=True, padx=60)

        # Razorpay Logo
        try:
            # Use the local fixed version if available
            logo_path = r"D:\Printr\Assets\razorpay_logo_fixed.png"
            if not os.path.exists(logo_path):
                # Fallback to download with headers
                url = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Razorpay_logo.svg/960px-Razorpay_logo.svg.png?_=20171127075036"
                headers = {'User-Agent': 'Mozilla/5.0'}
                response = requests.get(url, headers=headers, timeout=5)
                logo_data = Image.open(io.BytesIO(response.content))
                logo_data.save(logo_path)
            
            rzp_img_raw = Image.open(logo_path)
            # 960x204 -> aspect 4.7
            rzp_logo_img = ctk.CTkImage(light_image=rzp_img_raw,
                                        dark_image=rzp_img_raw,
                                        size=(210, 45))
            ctk.CTkLabel(form_frame, image=rzp_logo_img, text="").pack(pady=(50, 20), anchor="w")
        except Exception as e:
            ctk.CTkLabel(form_frame, text="Razorpay", font=self.fonts["h2"], text_color="#3395FF").pack(pady=(50, 20), anchor="w")
            print(f"Error loading Razorpay logo: {e}")

        ctk.CTkLabel(form_frame, text="API Key Authentication", font=self.fonts["h2"], text_color=self.clr_text_main).pack(pady=(0, 10), anchor="w")
        ctk.CTkLabel(form_frame, text="Use your live or test secret keys to link your account", font=self.fonts["body"], text_color=self.clr_text_sec).pack(pady=(0, 30), anchor="w")

        # Razorpay Inputs
        ctk.CTkLabel(form_frame, text="Razorpay API Key", font=self.fonts["body_bold"], text_color=self.clr_text_main).pack(anchor="w")
        rzp_key = ctk.CTkEntry(form_frame, height=45, placeholder_text="rzp_live_...", fg_color="#F8FAFC", border_color=self.clr_border)
        rzp_key.pack(fill="x", pady=(8, 20))

        ctk.CTkLabel(form_frame, text="Razorpay Secret Key", font=self.fonts["body_bold"], text_color=self.clr_text_main).pack(anchor="w")
        rzp_secret = ctk.CTkEntry(form_frame, height=45, placeholder_text="••••••••••••••••", show="*", fg_color="#F8FAFC", border_color=self.clr_border)
        rzp_secret.pack(fill="x", pady=(8, 35))

        ctk.CTkButton(form_frame, text="Connect Razorpay", height=50, font=self.fonts["body_bold"], 
                      fg_color="#3395FF", hover_color="#277DDB", command=self.view_dashboard).pack(fill="x", pady=(0, 15))

        # Switch back to Standard
        ctk.CTkButton(form_frame, text="Back to Standard Login", height=40, font=self.fonts["small"], 
                      fg_color="transparent", text_color=self.clr_text_sec, hover_color="#F1F5F9", 
                      command=self.show_login).pack(fill="x")

        # Left Side: Branding (Same as main login)
        brand_frame = ctk.CTkFrame(login_container, fg_color=self.clr_primary, corner_radius=18)
        brand_frame.pack(side="left", fill="both", expand=True, padx=10, pady=10)
        brand_frame.pack_propagate(False)
        
        try:
            original_img = Image.open(r"D:\Printr\Assets\Printr_Logo_transparent_White.png")
            w, h = original_img.size
            aspect_ratio = w / h
            new_width = 200
            new_height = int(new_width / aspect_ratio)
            self.logo_img = ctk.CTkImage(light_image=original_img, dark_image=original_img, size=(new_width, new_height))
            ctk.CTkLabel(brand_frame, image=self.logo_img, text="").place(relx=0.5, rely=0.45, anchor="center")
        except:
            ctk.CTkLabel(brand_frame, text="PRINTR", font=self.fonts["logo"], text_color="#FFFFFF").place(relx=0.5, rely=0.4, anchor="center")
            ctk.CTkLabel(brand_frame, text="Professional Print Management", font=self.fonts["body"], text_color="#E0E7FF").place(relx=0.5, rely=0.48, anchor="center")

    def view_dashboard(self):
        self.setup_main_layout()
        self.header_title.configure(text="System Overview")
        self.set_active_nav("Dashboard")

        # Stats Grid (3 Columns)
        stats_frame = ctk.CTkFrame(self.content_area, fg_color="transparent")
        stats_frame.pack(fill="x", pady=(0, 40))
        stats_frame.grid_columnconfigure((0, 1, 2), weight=1)

        data = [
            ("Pending Orders", "14", self.clr_primary, "Requires Action"),
            ("Printer Status", "Online", self.clr_success, "Ready to Print"),
            ("Cloud Sync", "Synced", self.clr_success, "Last: 2m ago")
        ]
        
        for i, (t, v, color, sub) in enumerate(data):
            card = self.create_card(stats_frame)
            card.grid(row=0, column=i, padx=(0 if i==0 else 15, 15 if i==2 else 0), sticky="nsew")
            
            ctk.CTkLabel(card, text=t, font=self.fonts["body_bold"], text_color=self.clr_text_sec).pack(pady=(25, 5), padx=25, anchor="w")
            ctk.CTkLabel(card, text=v, font=self.fonts["h1"], text_color=color).pack(padx=25, anchor="w")
            ctk.CTkLabel(card, text=sub, font=self.fonts["small"], text_color=self.clr_text_sec).pack(pady=(5, 25), padx=25, anchor="w")

        # --- NEW: QUEUE SECTION ---
        queue_header = ctk.CTkFrame(self.content_area, fg_color="transparent")
        queue_header.pack(fill="x", pady=(0, 20))
        
        ctk.CTkLabel(queue_header, text="Current Print Queue", font=self.fonts["h2"], text_color=self.clr_text_main).pack(side="left")
        ctk.CTkLabel(queue_header, text="3 active members", font=self.fonts["small"], text_color=self.clr_text_sec).pack(side="left", padx=15, pady=(5,0))

        queue_members = [
            {"name": "Aditya Verma", "id": "#ORD-9928", "file": "Budget_Draft.pdf", "pages": "12 pgs", "status": "In Progress", "clr": self.clr_primary},
            {"name": "Sneha Kapoor", "id": "#ORD-9930", "file": "Invoice_V2.png", "pages": "1 pg", "status": "Pending", "clr": "#F59E0B"},
            {"name": "Rohan Das", "id": "#ORD-9931", "file": "Lecture_Notes.docx", "pages": "45 pgs", "status": "Ready", "clr": self.clr_success}
        ]

        for member in queue_members:
            m_card = self.create_card(self.content_area)
            m_card.pack(fill="x", pady=(0, 15))
            
            # Inner padding
            m_inner = ctk.CTkFrame(m_card, fg_color="transparent")
            m_inner.pack(fill="both", expand=True, padx=25, pady=20)
            
            # Left: Member Info
            info_frame = ctk.CTkFrame(m_inner, fg_color="transparent")
            info_frame.pack(side="left", fill="both")
            
            ctk.CTkLabel(info_frame, text=member["name"], font=self.fonts["body_bold"], text_color=self.clr_text_main).pack(anchor="w")
            ctk.CTkLabel(info_frame, text=member["id"], font=self.fonts["small"], text_color=self.clr_text_sec).pack(anchor="w")
            
            # Middle: File Info
            file_frame = ctk.CTkFrame(m_inner, fg_color="transparent")
            file_frame.pack(side="left", fill="both", padx=60)
            
            ctk.CTkLabel(file_frame, text=member["file"], font=self.fonts["body"], text_color=self.clr_text_main).pack(anchor="w")
            ctk.CTkLabel(file_frame, text=member["pages"], font=self.fonts["small"], text_color=self.clr_text_sec).pack(anchor="w")

            # Right: Status and Action
            actions_frame = ctk.CTkFrame(m_inner, fg_color="transparent")
            actions_frame.pack(side="right", fill="y")
            
            # Status Badge
            status_box = ctk.CTkFrame(actions_frame, fg_color="#F8FAFC", corner_radius=6, border_width=1, border_color="#E2E8F0")
            status_box.pack(side="left", padx=20)
            ctk.CTkLabel(status_box, text=member["status"], font=self.fonts["small"], text_color=member["clr"], padx=10, pady=2).pack()
            
            # Action Button
            ctk.CTkButton(actions_frame, text="View Details", width=100, height=32, font=self.fonts["small"], 
                          fg_color="transparent", border_width=1, border_color=self.clr_border, 
                          text_color=self.clr_text_main, hover_color="#F8FAFC").pack(side="right")

    def view_printer(self):
        self.setup_main_layout()
        self.header_title.configure(text="Printer Configuration")
        self.set_active_nav("Printer Config")

        # Form Card
        form_card = self.create_card(self.content_area)
        form_card.pack(fill="x")

        # Inner Container with padding
        inner = ctk.CTkFrame(form_card, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=40, pady=40)

        # 2 Column layout for form elements
        inner.grid_columnconfigure(0, weight=1)
        inner.grid_columnconfigure(1, weight=1)

        # Row 0
        ctk.CTkLabel(inner, text="General Settings", font=self.fonts["h2"], text_color=self.clr_text_main).grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 25))

        # Row 1: Protocol
        box1 = ctk.CTkFrame(inner, fg_color="transparent")
        box1.grid(row=1, column=0, sticky="nsew", padx=(0, 20), pady=(0, 20))
        ctk.CTkLabel(box1, text="Connection Protocol", font=self.fonts["body_bold"]).pack(anchor="w")
        ctk.CTkComboBox(box1, values=["USB 3.0", "TCP/IP (Ethernet)", "Bluetooth 5.0", "Serial"], height=40).pack(fill="x", pady=8)

        # Row 1: Hardware
        box2 = ctk.CTkFrame(inner, fg_color="transparent")
        box2.grid(row=1, column=1, sticky="nsew", pady=(0, 20))
        ctk.CTkLabel(box2, text="Assigned Hardware", font=self.fonts["body_bold"]).pack(anchor="w")
        ctk.CTkEntry(box2, placeholder_text="Scanning devices...", height=40, border_color=self.clr_border).pack(fill="x", pady=8)

        # Row 2: Action
        ctk.CTkButton(inner, text="Save & Initialize Interface", height=45, fg_color=self.clr_primary, 
                      font=self.fonts["body_bold"], width=220).grid(row=2, column=0, sticky="w", pady=(20, 0))

    def view_razorpay_setup(self):
        self.setup_main_layout()
        self.header_title.configure(text="Razorpay Configuration")
        self.set_active_nav("Razorpay Setup")

        # Configuration Card
        config_card = self.create_card(self.content_area)
        config_card.pack(fill="x")

        inner = ctk.CTkFrame(config_card, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=40, pady=40)

        # Header with Logo
        header_frame = ctk.CTkFrame(inner, fg_color="transparent")
        header_frame.pack(fill="x", pady=(0, 30))

        try:
            logo_path = r"D:\Printr\Assets\razorpay_logo_fixed.png"
            rzp_img_raw = Image.open(logo_path)
            self.rzp_dash_img = ctk.CTkImage(light_image=rzp_img_raw, dark_image=rzp_img_raw, size=(190, 40))
            ctk.CTkLabel(header_frame, image=self.rzp_dash_img, text="").pack(side="left")
        except:
            ctk.CTkLabel(header_frame, text="RAZORPAY", font=self.fonts["h2"], text_color="#3395FF").pack(side="left")

        ctk.CTkLabel(inner, text="Merchant API Credentials", font=self.fonts["h2"], text_color=self.clr_text_main).pack(anchor="w", pady=(20, 10))
        ctk.CTkLabel(inner, text="Manage your keys for live and test transactions.", font=self.fonts["body"], text_color=self.clr_text_sec).pack(anchor="w", pady=(0, 30))

        # Two-column layout for inputs
        grid_frame = ctk.CTkFrame(inner, fg_color="transparent")
        grid_frame.pack(fill="x")
        grid_frame.columnconfigure((0, 1), weight=1)

        # API Key
        key_box = ctk.CTkFrame(grid_frame, fg_color="transparent")
        key_box.grid(row=0, column=0, sticky="nsew", padx=(0, 20))
        ctk.CTkLabel(key_box, text="Razorpay API Key", font=self.fonts["body_bold"]).pack(anchor="w")
        ctk.CTkEntry(key_box, placeholder_text="rzp_live_...", height=45, border_color=self.clr_border).pack(fill="x", pady=8)

        # Secret Key
        secret_box = ctk.CTkFrame(grid_frame, fg_color="transparent")
        secret_box.grid(row=0, column=1, sticky="nsew")
        ctk.CTkLabel(secret_box, text="Razorpay Secret Key", font=self.fonts["body_bold"]).pack(anchor="w")
        ctk.CTkEntry(secret_box, placeholder_text="••••••••••••••••", height=45, border_color=self.clr_border, show="*").pack(fill="x", pady=8)

        # Webhook Secret (Optional Addition for completeness)
        ctk.CTkLabel(inner, text="Webhook Secret (Optional)", font=self.fonts["body_bold"]).pack(anchor="w", pady=(20, 0))
        ctk.CTkEntry(inner, placeholder_text="whsec_...", height=45, border_color=self.clr_border).pack(fill="x", pady=8)

        # Save Button
        ctk.CTkButton(inner, text="Save Configuration", height=45, fg_color="#3395FF", hover_color="#277DDB",
                      font=self.fonts["body_bold"], width=200).pack(anchor="w", pady=(40, 0))

    def view_cod(self):
        self.setup_main_layout()
        self.header_title.configure(text="COD Verification")
        self.set_active_nav("COD Verification")

        # Main Split
        main_grid = ctk.CTkFrame(self.content_area, fg_color="transparent")
        main_grid.pack(fill="both", expand=True)
        main_grid.grid_columnconfigure(0, weight=3) # Input side
        main_grid.grid_columnconfigure(1, weight=2) # Log side

        # 1. Input Side
        input_card = self.create_card(main_grid)
        input_card.grid(row=0, column=0, sticky="nsew", padx=(0, 25))

        inner_input = ctk.CTkFrame(input_card, fg_color="transparent")
        inner_input.pack(fill="both", expand=True, padx=40, pady=40)

        ctk.CTkLabel(inner_input, text="Transaction Verification", font=self.fonts["h2"]).pack(anchor="w", pady=(0, 10))
        ctk.CTkLabel(inner_input, text="Scan or manually enter the Order ID to verify payment", font=self.fonts["body"], text_color=self.clr_text_sec).pack(anchor="w", pady=(0, 30))
        
        ctk.CTkLabel(inner_input, text="Scan Order ID", font=self.fonts["body_bold"]).pack(anchor="w")
        order_entry = ctk.CTkEntry(inner_input, placeholder_text="e.g. #ORD-7721", height=50, border_color=self.clr_border, fg_color="#F8FAFC")
        order_entry.pack(fill="x", pady=(8, 40))

        # Bottom Buttons
        btn_frame = ctk.CTkFrame(inner_input, fg_color="transparent")
        btn_frame.pack(fill="x")
        
        ctk.CTkButton(btn_frame, text="Reject Order", fg_color="transparent", border_width=1, border_color=self.clr_danger,
                      text_color=self.clr_danger, hover_color="#FEF2F2", width=150, height=48, font=self.fonts["body_bold"]).pack(side="left", padx=(0, 15))
        
        ctk.CTkButton(btn_frame, text="Verify & Process Print", fg_color=self.clr_success, hover_color="#15803D",
                      height=48, font=self.fonts["body_bold"]).pack(side="left", fill="x", expand=True)

        # 2. Log Side
        log_card = self.create_card(main_grid)
        log_card.grid(row=0, column=1, sticky="nsew")
        log_card.configure(fg_color="#F8FAFC") # Slightly offset background for logs

        ctk.CTkLabel(log_card, text="Verification Activity", font=self.fonts["body_bold"], text_color=self.clr_text_main).pack(pady=(30, 20))
        
        # Simulated log items
        logs_inner = ctk.CTkFrame(log_card, fg_color="transparent")
        logs_inner.pack(fill="both", expand=True, padx=20)

        ctk.CTkLabel(logs_inner, text="No recent activity", text_color=self.clr_text_sec, font=self.fonts["small"]).pack(pady=40)

if __name__ == "__main__":
    app = EnterpriseApp()
    app.mainloop()