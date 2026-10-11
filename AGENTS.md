# AGENTS.md

> [!IMPORTANT]
> **MANDATORY DIRECTIVE FOR ALL AI AGENTS**:
> Any time **ANY** agent action is performed in this project (including creating code, modifying files, debugging, adding features, updating configurations, or refactoring), the agent **MUST update this `AGENTS.md` file** before concluding its turn.
>
> Keep the **Project Structure**, **Architecture Notes**, and **Agent Action Log** up to date so that subsequent agents retain full context.

---

## 🤖 Agent Operating Rules & Protocols

1. **Mandatory Documentation Update**:
   - Always append an entry to the [Agent Action Log](#-agent-action-log) at the bottom of this file describing:
     - Date & Timestamp
     - Task description and motivation
     - Key files created, changed, or removed
     - Current state / any pending next steps
2. **Working Directory for Dependencies & Scripts**:
   - The primary application code, package manifest, and build configs are located in `./Frontend`.
   - Always run commands like `npm run dev`, `npm run build`, `npm install` inside the `Frontend/` folder (`d:\Printr\Windows_App\Frontend`), NOT at the repository root.
3. **Electron Security & Architecture**:
   - Main process logic lives in [`Frontend/main.js`](file:///d:/Printr/Windows_App/Frontend/main.js).
   - Renderer process runs React in [`Frontend/src`](file:///d:/Printr/Windows_App/Frontend/src).
   - Never expose raw Node.js APIs to the renderer; use `contextBridge` in [`Frontend/preload.js`](file:///d:/Printr/Windows_App/Frontend/preload.js) for IPC.
   - IPC channels currently registered:
     - `get-printers`: Enumerates system-connected printers.
     - `print-file`: Spools document printing via `pdf-to-printer` or native Electron web contents.
4. **Backend API Integrations**:
   - Production API base URL is configured in [`Frontend/src/config.ts`](file:///d:/Printr/Windows_App/Frontend/src/config.ts) (`https://printr-backend.onrender.com`).
   - Use the `getHeaders()` helper to automatically attach the Bearer token stored in `localStorage` under `printr_token`.

---

## 📂 Current Project Structure

```text
d:\Printr\Windows_App\
├── .gitignore                          # Git ignore rules for node, electron, and build artifacts
├── Assets/                             # Branding, logos, and UI illustration assets
│   ├── Logo_black_bg.png              # Printr brand logo (dark variant)
│   ├── Logo_white.png                 # Printr brand logo (white variant)
│   ├── Printr_Logo_transparent.png    # Transparent PNG logo
│   ├── Printr_Logo_transparent_White.png # Transparent white logo
│   ├── Printr_logo.psd                # Source Photoshop logo file
│   ├── login_bg.png                   # Background illustration for login screen
│   ├── login_bg_new.png               # Updated login background artwork
│   └── premium_bg.png                 # Premium dashboard visual backdrop
├── Frontend/                           # Main Electron + React desktop project
│   ├── index.html                      # Single-page HTML entry point for Vite
│   ├── main.js                         # Electron main process (window lifecycle, IPC handlers, printing)
│   ├── preload.js                      # Electron preload script exposing safe `window.electronAPI`
│   ├── package.json                    # Electron, React 19, Vite, and build scripts
│   ├── package-lock.json               # Locked dependency tree
│   ├── tsconfig.json                   # TypeScript compiler configuration
│   ├── vite.config.ts                  # Vite build setup with React SWC plugin
│   ├── public/                         # Static web assets served by Vite
│   │   ├── favicon.svg                 # Application favicon
│   │   └── icons.svg                   # Vector sprite/icons
│   └── src/                            # React renderer source files
│       ├── main.tsx                    # React application bootstrap
│       ├── App.tsx                     # Top-level application router & layout controller
│       ├── App.css                     # Global application styles
│       ├── index.css                   # Baseline HTML element styling
│       ├── theme.css                   # Design tokens, color system, and UI variables
│       ├── config.ts                   # API base URL and token authorization header helper
│       ├── assets/                     # Component-level static assets (logos, icons)
│       └── components/                 # React UI Views & Components
│           ├── Auth.tsx                # Vendor login & registration modal/form
│           ├── Dashboard.tsx           # Print queue, active orders, and status management
│           ├── CODVerification.tsx     # Cash on delivery order verification tool
│           ├── PrinterConfig.tsx       # Printer selection, paper size, pricing & UPI settings
│           └── Sidebar.tsx             # Main desktop navigation sidebar
├── src/                                # Local / mock backend scripts (secondary/testing)
│   ├── main/
│   │   └── server.js                   # Express mock server for offline print queue & stats testing
│   └── renderer/
│       └── components/
│           └── Auth.tsx                # Standalone/legacy Auth component
├── README.md                           # Main user and developer setup documentation
└── AGENTS.md                           # Autonomous agent rules, project tree, and action logs
```

---

## 🧱 Key Components & Responsibilities

| File / Component                                                                                                           | Process / Role   | Description                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| [`Frontend/main.js`](file:///d:/Printr/Windows_App/Frontend/main.js)                                                       | Electron Main    | Creates BrowserWindow, registers IPC listeners (`get-printers`, `print-file`), handles OS-level PDF spooling. |
| [`Frontend/preload.js`](file:///d:/Printr/Windows_App/Frontend/preload.js)                                                 | Electron Preload | Securely bridges `getPrinters()` and `printFile()` to `window.electronAPI`.                                   |
| [`Frontend/src/App.tsx`](file:///d:/Printr/Windows_App/Frontend/src/App.tsx)                                               | React Renderer   | Controls authentication guard state, active navigation tab, and top-level layout structure.                   |
| [`Frontend/src/components/Auth.tsx`](file:///d:/Printr/Windows_App/Frontend/src/components/Auth.tsx)                       | React Component  | Handles vendor authentication, token storage (`printr_token`), and credentials persistence.                   |
| [`Frontend/src/components/Dashboard.tsx`](file:///d:/Printr/Windows_App/Frontend/src/components/Dashboard.tsx)             | React Component  | Fetches active print queue, displays file details, handles live printing triggers and status changes.         |
| [`Frontend/src/components/CODVerification.tsx`](file:///d:/Printr/Windows_App/Frontend/src/components/CODVerification.tsx) | React Component  | Validates cash-on-delivery payments from customers before handing out printouts.                              |
| [`Frontend/src/components/PrinterConfig.tsx`](file:///d:/Printr/Windows_App/Frontend/src/components/PrinterConfig.tsx)     | React Component  | Configures connected hardware printers, paper dimensions (A4, A3), duplex/color rates, and UPI IDs.           |
| [`Frontend/src/components/Sidebar.tsx`](file:///d:/Printr/Windows_App/Frontend/src/components/Sidebar.tsx)                 | React Component  | Desktop navigation bar for switching between Dashboard, COD, Printer Config, UPI, and Logout.                 |

---

## 📝 Agent Action Log

Whenever an agent takes action in this repository, append a new entry to the table below.

| Date       | Agent / Action                      | Summary of Changes                                                                                                                                                                                                                                                                                                                              | Impacted Files                                                                                                         |
| ---------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 2026-10-11 | Initial Documentation Setup         | Created `README.md` and `AGENTS.md`. Documented project purpose, architecture, native printing workflows, setup commands, agent update protocol, and initial project structure.                                                                                                                                                                 | [`README.md`](file:///d:/Printr/Windows_App/README.md), [`AGENTS.md`](file:///d:/Printr/Windows_App/AGENTS.md)         |
| 2026-10-11 | Keyboard Input Fix in Pricing Slabs | Replaced rigid controlled `<input type="number">` fields in `PrinterConfig.tsx` with a flexible `PriceField` component supporting full keyboard text typing (including decimals, clearing, and backspacing), keyboard arrow keys (Up/Down step increment/decrement), and UI stepper buttons. Sanitized numeric types prior to API PUT dispatch. | [`Frontend/src/components/PrinterConfig.tsx`](file:///d:/Printr/Windows_App/Frontend/src/components/PrinterConfig.tsx) |
| 2026-10-11 | Syntax Error Fix in PrinterConfig   | Fixed duplicate JSX closing tags `</section> </div>` around line 559 in `PrinterConfig.tsx` causing 'Declaration or statement expected' parser errors.                                                                                                                                                                                          | [`Frontend/src/components/PrinterConfig.tsx`](file:///d:/Printr/Windows_App/Frontend/src/components/PrinterConfig.tsx) |
| 2026-10-11 | Blue Logo & Accent Refresh          | Added new 3D blue printer app icon (`Printr_app_icon.png`) to `Sidebar`, `Dashboard`, `Auth`, and Electron window icon. Refreshed UI accents to a cohesive, professional blue & white theme (active navigation tabs, primary CTA buttons, focus rings, badges, header bar) while preserving exact UI structures.                               | [`Frontend/src/theme.css`](file:///d:/Printr/Windows_App/Frontend/src/theme.css), [`Frontend/src/components/Sidebar.tsx`](file:///d:/Printr/Windows_App/Frontend/src/components/Sidebar.tsx), [`Frontend/src/components/Dashboard.tsx`](file:///d:/Printr/Windows_App/Frontend/src/components/Dashboard.tsx), [`Frontend/src/components/Auth.tsx`](file:///d:/Printr/Windows_App/Frontend/src/components/Auth.tsx), [`Frontend/src/components/PrinterConfig.tsx`](file:///d:/Printr/Windows_App/Frontend/src/components/PrinterConfig.tsx), [`Frontend/src/App.tsx`](file:///d:/Printr/Windows_App/Frontend/src/App.tsx), [`Frontend/main.js`](file:///d:/Printr/Windows_App/Frontend/main.js) |
| 2026-10-11 | COD Verification & Dual Buttons     | Fixed 'order id not found' bug caused by aggressive regex truncation (`replace(/^.*(\\d+)$/, "$1")`). Cleaned order ID sanitization, integrated full order lookup with metadata preview card, and split verification into two distinct, dedicated buttons: 'Verify Order' and 'Print Files' (with native Electron printer spooling). Added error handling and professional UI feedback. | [`Frontend/src/components/CODVerification.tsx`](file:///d:/Printr/Windows_App/Frontend/src/components/CODVerification.tsx) |
| 2026-10-11 | Auth Logo Frame Background Fix      | Restored original uploaded 3D blue printer asset. Changed inner frame background from light-blue gradient to solid white (`#FFFFFF`) to eliminate inner border mismatch, increased image size to 72px within an 84px frame for enhanced logo clarity and visibility, and cleaned up temporary assets.                                          | [`Frontend/src/components/Auth.tsx`](file:///d:/Printr/Windows_App/Frontend/src/components/Auth.tsx), [`Frontend/src/assets/Printr_app_icon.png`](file:///d:/Printr/Windows_App/Frontend/src/assets/Printr_app_icon.png) |

