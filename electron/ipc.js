const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let pythonBridgeRef = null;

function setupIPC(mainWindow, pythonBridge) {
    pythonBridgeRef = pythonBridge;

    // Only register handlers once
    if (setupIPC._registered) return;
    setupIPC._registered = true;

    ipcMain.on('python-cmd', (event, command) => {
        if (pythonBridgeRef) {
            pythonBridgeRef.send(command);
        }
    });

    ipcMain.on('window-minimize', () => {
        if (mainWindow) {
            mainWindow.minimize();
        }
    });

    ipcMain.on('window-close', () => {
        if (mainWindow) {
            mainWindow.close();
        }
    });

    ipcMain.handle('get-app-version', () => app.getVersion());

    ipcMain.handle('get-launch-at-login', () => {
        try {
            return app.getLoginItemSettings().openAtLogin;
        } catch (err) {
            console.error('[login-item] get failed:', err);
            return false;
        }
    });

    ipcMain.handle('set-launch-at-login', (event, enabled) => {
        try {
            app.setLoginItemSettings({
                openAtLogin: Boolean(enabled),
                args: ['--hidden']
            });
            return Boolean(enabled);
        } catch (err) {
            console.error('[login-item] set failed:', err);
            throw err;
        }
    });

    // Config saving functionality
    const configDir = path.join(app.getPath('userData'));
    const configFile = path.join(configDir, 'config.json');

    ipcMain.handle('load-config', async () => {
        try {
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            if (fs.existsSync(configFile)) {
                const data = fs.readFileSync(configFile, 'utf-8');
                return JSON.parse(data);
            }
            return null;
        } catch (err) {
            console.error('Failed to load config', err);
            return null;
        }
    });

    ipcMain.handle('save-config', async (event, config) => {
        try {
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
            return true;
        } catch (err) {
            console.error('Failed to save config', err);
            return false;
        }
    });
}

module.exports = { setupIPC };
