import { app, BrowserWindow, session, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';

ipcMain.handle('get-printers', async (event) => {
  try {
    return await event.sender.getPrintersAsync();
  } catch (err) {
    console.error("IPC get-printers error:", err);
    try {
      return event.sender.getPrinters();
    } catch (syncErr) {
      console.error("Fallback getPrinters also failed:", syncErr);
      return [];
    }
  }
});

import { print } from 'unix-print';

ipcMain.handle('print-file', async (event, { filePath, printerName, isColor, copies, sides }) => {
  try {
    const options = [];
    
    // 1. Color Management
    if (isColor) {
      options.push('-o ColorModel=Color');
    } else {
      options.push('-o ColorModel=Gray');
    }

    // 2. Copies
    if (copies && copies > 1) {
      options.push(`-n ${copies}`);
    }

    // 3. Duplexing (sides)
    if (sides) {
      options.push(`-o sides=${sides}`);
    }

    // Attempt to print via unix-print
    // Trim printer name to avoid shell errors
    const targetPrinter = (printerName || '').trim();
    if (!targetPrinter) throw new Error("No printer name provided to native print spooler.");

    console.info(`[PrintJob] Dispatching to ${targetPrinter} | Copies: ${copies || 1} | Sides: ${sides || 'one-sided'}`);
    
    await print(filePath, targetPrinter, options);
    return { success: true };
  } catch (err) {
    console.error("IPC print-file error:", err);
    return { success: false, error: err.message };
  }
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'dist/index.html')}`;

  mainWindow.loadURL(startURL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  const allowed = [
    'localhost',
    'onrender.com',
    'cloudflarestorage.com'
  ];
  
  if (allowed.some(domain => url.includes(domain))) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

app.whenReady().then(() => {
  session.defaultSession.setCertificateVerifyProc((request, callback) => {
    const { hostname } = request;
    if (
      hostname === 'localhost' || 
      hostname.includes('onrender.com') || 
      hostname.includes('cloudflarestorage.com')
    ) {
      callback(0); // Trust
    } else {
      callback(-3); // Default behavior
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
