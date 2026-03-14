import customtkinter as ctk
from backend.database import init_db
from frontend.theme import Theme
from frontend.pages.login_page import LoginPage
from frontend.pages.registration_page import RegistrationPage
from frontend.pages.dashboard_page import DashboardPage
from frontend.pages.printer_config_page import PrinterConfigPage
from frontend.pages.upi_setup_page import UpiSetupPage
from frontend.pages.cod_verification_page import CodVerificationPage

class EnterpriseApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Printr | Enterprise Management v2.0")
        self.geometry("1100x700")
        self.configure(fg_color=Theme.CLR_BG)

        # State and Containers
        self.sidebar = None
        self.header = None
        self.content_area = None
        self.nav_buttons = {}
        self.current_page_name = None
        self.current_vendor_id = None
        self.active_auth_page = None # Track login/registration page
        
        # The client now talks to the Render API instead of the DB directly.
        # DB initialization now happens on the Render server.

        # Attempt to resume session
        from frontend.api_client import APIClient
        session = APIClient.load_session()
        if session:
            self.current_vendor_id = session.get("vendor_id")
            self.show_page("dashboard")
        else:
            self.show_page("login")

    def clear_screen(self):
        for widget in self.winfo_children():
            widget.destroy()

    def show_page(self, page_name):
        """Main routing function."""
        if page_name in ["login", "registration"]:
            self.clear_screen()
            w, h = (850, 520) if page_name == "login" else (600, 600)
            if page_name == "login":
                page = LoginPage(self, self, width=w, height=h)
            else:
                page = RegistrationPage(self, self, width=w, height=h)
            self.active_auth_page = page
            page.place(relx=0.5, rely=0.5, anchor="center")
        else:
            if not self.sidebar:
                self.show_main_layout()
            
            # Clear previous content
            for widget in self.content_area.winfo_children():
                widget.destroy()
            
            self.set_active_nav(page_name)
            
            if page_name == "dashboard":
                self.header_title.configure(text="System Overview")
                DashboardPage(self.content_area, self).pack(fill="both", expand=True)
            elif page_name == "printer":
                self.header_title.configure(text="Printer Configuration")
                PrinterConfigPage(self.content_area, self).pack(fill="both", expand=True)
            elif page_name == "cod":
                self.header_title.configure(text="COD Verification")
                CodVerificationPage(self.content_area, self).pack(fill="both", expand=True)
            elif page_name == "upi":
                self.header_title.configure(text="UPI Payment Setup")
                UpiSetupPage(self.content_area, self).pack(fill="both", expand=True)

    def show_main_layout(self):
        self.clear_screen()
        
        # 1. Sidebar (Scrollable for smaller screens/more items)
        self.sidebar = ctk.CTkScrollableFrame(self, width=240, fg_color=Theme.CLR_SIDEBAR, corner_radius=0, border_width=0)
        self.sidebar.pack(side="left", fill="y")
        # Ensure sidebar doesn't expand horizontally beyond width
        self.sidebar._parent_canvas.configure(width=240) 

        # Global Linux Scroll Binding (Button-4/5)
        self.bind_all("<Button-4>", lambda e: self._handle_linux_scroll(e, -1))
        self.bind_all("<Button-5>", lambda e: self._handle_linux_scroll(e, 1))

        sidebar_border = ctk.CTkFrame(self, width=1, fg_color=Theme.CLR_BORDER)
        sidebar_border.pack(side="left", fill="y")

        logo_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        logo_frame.pack(pady=(40, 40), padx=20, fill="x")
        ctk.CTkLabel(logo_frame, text="PRINTR", font=Theme.FONTS["logo"], text_color=Theme.CLR_PRIMARY).pack(side="left")

        self.nav_buttons = {}
        menu_items = [
            ("Dashboard", "dashboard"),
            ("Printer Config", "printer"),
            ("COD Verification", "cod"),
            ("UPI ID Setup", "upi")
        ]

        for text, page_id in menu_items:
            btn = ctk.CTkButton(
                self.sidebar, text=text, height=45, fg_color="transparent", 
                text_color=Theme.CLR_TEXT_MAIN, anchor="w", font=Theme.FONTS["body"],
                hover_color="#E2E8F0", corner_radius=8, # Slightly darker hover for clear feedback
                command=lambda p=page_id: self.show_page(p)
            )
            btn.pack(fill="x", padx=10, pady=2)
            self.nav_buttons[page_id] = btn

        logout_btn = ctk.CTkButton(
            self.sidebar, text="Sign Out", height=40, fg_color="transparent", 
            text_color=Theme.CLR_DANGER, font=Theme.FONTS["body_bold"],
            hover_color="#FEF2F2", command=self.handle_logout
        )
        logout_btn.pack(side="bottom", fill="x", padx=10, pady=20)

        main_wrapper = ctk.CTkFrame(self, fg_color="transparent")
        main_wrapper.pack(side="right", fill="both", expand=True)

        self.header = ctk.CTkFrame(main_wrapper, height=70, fg_color=Theme.CLR_HEADER, corner_radius=0)
        self.header.pack(side="top", fill="x")
        self.header.pack_propagate(False)
        
        ctk.CTkFrame(main_wrapper, height=1, fg_color=Theme.CLR_BORDER).pack(side="top", fill="x")

        self.header_title = ctk.CTkLabel(self.header, text="Dashboard", font=Theme.FONTS["h2"], text_color=Theme.CLR_TEXT_MAIN)
        self.header_title.pack(side="left", padx=30, pady=20)

        self.content_area = ctk.CTkScrollableFrame(main_wrapper, fg_color="transparent", corner_radius=0)
        self.content_area.pack(fill="both", expand=True, padx=40, pady=30)

    def set_active_nav(self, name):
        for btn_id, btn in self.nav_buttons.items():
            if btn_id == name:
                btn.configure(fg_color=Theme.CLR_PRIMARY, text_color="#FFFFFF", hover_color=Theme.CLR_PRIMARY)
            else:
                btn.configure(fg_color="transparent", text_color=Theme.CLR_TEXT_MAIN, hover_color="#F1F5F9")

    def _handle_linux_scroll(self, event, direction):
        """Intelligently handle Linux scroll events based on mouse position."""
        # Get the widget under the mouse
        widget = self.winfo_containing(event.x_root, event.y_root)
        if not widget:
            return

        # Check if the widget is within the sidebar or content area
        # and scroll the appropriate container
        curr = widget
        while curr:
            if curr == self.sidebar:
                try: self.sidebar._parent_canvas.yview_scroll(direction, "units")
                except: pass
                return
            if curr == self.content_area:
                try: self.content_area._parent_canvas.yview_scroll(direction, "units")
                except: pass
                return
            if curr == self.active_auth_page and isinstance(self.active_auth_page, ctk.CTkScrollableFrame):
                try: self.active_auth_page._parent_canvas.yview_scroll(direction, "units")
                except: pass
                return
            curr = curr.master

    def handle_logout(self):
        from frontend.api_client import APIClient
        APIClient.clear_session()
        self.sidebar = None # Reset state
        self.show_page("login")

if __name__ == "__main__":
    app = EnterpriseApp()
    app.mainloop()