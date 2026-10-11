# Printr Windows Desktop Application

A modern desktop application built for print shops and vendors to manage, automate, and streamline customer print orders, hardware printer queues, and cash-on-delivery (COD) verification.

---

## 🚀 Overview

**Printr Desktop** connects print vendors with the Printr cloud platform. It integrates directly with local Windows printers to automatically fetch, preview, and spool documents with specific print settings (color/grayscale, page ranges, simplex/duplex, and copy count).

### Key Features

- **🔐 Vendor Authentication**: Secure vendor login and session persistence with token-based API authentication.
- **📄 Native Windows Printing**: Direct print spooling using `pdf-to-printer` with fallback to native Electron print APIs. Supports auto-detection of system printers, page sizing, duplex/simplex, and color options.
- **📊 Real-time Order & Print Queue**: Instant view of incoming print jobs, customer document downloads, and print status tracking.
- **💵 COD Verification**: Real-time verification and receipt management for Cash on Delivery orders.
- **⚙️ Hardware & Pricing Configuration**: Manage default printers, paper sizes (A4, A3, etc.), pricing per page, and UPI QR code settings.

---

## 🛠️ Tech Stack

- **Runtime & Desktop Framework**: [Electron 41](https://www.electronjs.org/)
- **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite 5](https://vitejs.dev/) with `@vitejs/plugin-react-swc`
- **UI & Icons**: Vanilla CSS (Custom Design System with design tokens in `theme.css`), [Lucide React](https://lucide.dev/)
- **PDF & Document Processing**: [pdf-lib](https://pdf-lib.js.org/), [pdf-to-printer](https://github.com/artiebits/pdf-to-printer)
- **Packaging & Distribution**: [electron-builder](https://www.electron.build/) (NSIS Windows Installer)

---

## 📁 Repository Structure

```text
Windows_App/
├── Assets/                    # Brand assets, logos, and UI backgrounds
│   ├── Logo_black_bg.png
│   ├── Logo_white.png
│   ├── Printr_Logo_transparent.png
│   ├── login_bg.png
│   └── premium_bg.png
├── Frontend/                  # Core Electron + React application
│   ├── index.html             # Vite entry HTML
│   ├── main.js                # Electron main process (lifecycle & native IPC)
│   ├── preload.js             # Electron preload script (safe IPC bridge)
│   ├── package.json           # Application dependencies and build scripts
│   ├── tsconfig.json          # TypeScript configuration
│   ├── vite.config.ts         # Vite build configuration
│   ├── public/                # Static public assets (favicons, SVGs)
│   └── src/                   # React renderer source code
│       ├── main.tsx           # React DOM root entry
│       ├── App.tsx            # Root layout & tab router
│       ├── config.ts          # Backend API URL & auth header configuration
│       ├── theme.css          # Color palettes, typography & theme tokens
│       └── components/
│           ├── Auth.tsx             # Login & vendor authentication
│           ├── Dashboard.tsx        # Print queue and order management
│           ├── CODVerification.tsx  # Cash on delivery verification portal
│           ├── PrinterConfig.tsx    # Hardware printer & pricing settings
│           └── Sidebar.tsx          # Application navigation sidebar
├── src/                       # Legacy/mock server utilities
│   ├── main/server.js         # Local mock Express server for offline testing
│   └── renderer/components/   # Legacy standalone components
├── README.md                  # Project documentation
└── AGENTS.md                  # Autonomous agent instructions and changelog
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js**: v18 or later (v20+ recommended)
- **npm**: v9 or later
- **Operating System**: Windows 10/11 (with local or network printers configured)

### Installation

All application scripts and dependencies reside inside the `Frontend` directory:

```bash
cd Frontend
npm install
```

### Development Mode

Run the React Vite dev server concurrently with Electron:

```bash
npm run dev
```

This starts:

1. Vite dev server on `http://localhost:3000`
2. Electron window pointing to the dev server once ready

### Production Build & Packaging

Build the frontend bundle:

```bash
npm run build
```

Package the standalone Windows installer (`.exe` NSIS package):

```bash
npm run dist
```

The installer will be generated in `Frontend/dist-electron/`.

---

## 🔌 API & Backend Configuration

The desktop client connects to the Printr cloud backend defined in [`Frontend/src/config.ts`](file:///d:/Printr/Windows_App/Frontend/src/config.ts):

- **Base URL**: `https://printr-backend.onrender.com`
- **Authentication**: JWT Bearer token stored in `localStorage` under `printr_token`.

---

## 📜 Agent Guidelines

Please refer to [`AGENTS.md`](file:///d:/Printr/Windows_App/AGENTS.md) for automated agent interaction protocols and mandatory logging guidelines.
