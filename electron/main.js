const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { createTray } = require('./tray');
const { setupIPC } = require('./ipc');
const PythonBridge = require('./python-bridge');

let mainWindow;
let pythonBridge;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f0f0f',
      symbolColor: '#ffffff'
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'remappr_logo_1_1772933761473.png')
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Register IPC handlers BEFORE creating window so they're ready
    // when the renderer loads and calls invoke('load-config')
    setupIPC(null, null);

    createWindow();

    // Wait for the renderer to fully load before starting Python,
    // so it doesn't miss the initial controller_connected event
    mainWindow.webContents.on('did-finish-load', () => {
      pythonBridge = new PythonBridge(mainWindow);
      pythonBridge.start();

      // Update IPC with the real references
      setupIPC(mainWindow, pythonBridge);
    });

    try {
      createTray(mainWindow);
    } catch (e) {
      console.warn('Could not create tray icon:', e.message);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        mainWindow.show();
      }
    });
  });
}


app.on('before-quit', () => {
  app.isQuitting = true;
  if (pythonBridge) {
    pythonBridge.stop();
  }
});

app.on('window-all-closed', () => {
  // Don't quit - the app should keep running in the system tray
});
