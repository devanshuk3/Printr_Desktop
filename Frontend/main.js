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

import os from 'os';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

function getFileType(filePath) {
  const buffer = Buffer.alloc(4);
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
  } catch (e) {
    return 'unknown';
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'pdf';
  } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'png';
  } else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'jpg';
  }
  return 'unknown';
}

ipcMain.handle('print-file', async (event, { filePath, printerName, isColor, copies, sides }) => {
  try {
    const targetPrinter = (printerName || '').trim();
    if (!targetPrinter) throw new Error("No printer name provided to native print spooler.");

    console.info(`[PrintJob] Dispatching to ${targetPrinter} | Copies: ${copies || 1} | Sides: ${sides || 'one-sided'} | Color: ${isColor}`);
    
    let finalFilePath = filePath;
    const fileType = getFileType(filePath);

    if (fileType === 'png' || fileType === 'jpg') {
      console.info(`[PrintJob] Image detected (${fileType}), converting to PDF...`);
      const imageBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.create();
      let image;
      if (fileType === 'png') {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }
      
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });

      const pdfBytes = await pdfDoc.save();
      finalFilePath = `${filePath}.pdf`;
      fs.writeFileSync(finalFilePath, pdfBytes);
      console.info(`[PrintJob] Successfully converted to PDF: ${finalFilePath}`);
    } else if (fileType === 'unknown') {
      const ext = path.extname(filePath).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
         console.info(`[PrintJob] Image extension detected, converting to PDF...`);
         const imageBytes = fs.readFileSync(filePath);
         const pdfDoc = await PDFDocument.create();
         let image;
         if (ext === '.png') {
           image = await pdfDoc.embedPng(imageBytes);
         } else {
           image = await pdfDoc.embedJpg(imageBytes);
         }
         const page = pdfDoc.addPage([image.width, image.height]);
         page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
         const pdfBytes = await pdfDoc.save();
         finalFilePath = `${filePath}.pdf`;
         fs.writeFileSync(finalFilePath, pdfBytes);
      }
    }

    if (os.platform() === 'win32') {
      const ptpModule = await import('pdf-to-printer');
      const ptp = ptpModule.default || ptpModule;
      
      const ptpOptions = {
        printer: targetPrinter,
        copies: Number(copies) || 1,
      };
      
      console.info(`[Printer] Windows Print Spooler options (JSON):`, JSON.stringify(ptpOptions));
      
      // pdf-to-printer provides basic printing functionality.
      if (typeof ptp.print === 'function') {
        await ptp.print(finalFilePath, ptpOptions);
      } else if (typeof ptp === 'function') {
        // Fallback if the default export itself is the print function
        await ptp(finalFilePath, ptpOptions);
      } else {
        throw new Error("Could not find print function in pdf-to-printer module");
      }
    } else {
      const { print } = await import('unix-print');
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
      
      await print(finalFilePath, targetPrinter, options);
    }

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
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  const startURL = isDev
  ? 'http://localhost:3000'
  : `file://${path.join(app.getAppPath(), 'dist/index.html')}`;

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

    if (hostname === 'localhost') {
      callback(0); // trust only local dev
    } else {
      callback(-3); // default secure behavior
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
