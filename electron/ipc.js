const { ipcMain, dialog, BrowserWindow } = require('electron');
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

    const LOGIN_ITEM_NAME = 'Remappr';

    ipcMain.handle('get-launch-at-login', () => {
        try {
            const settings = app.getLoginItemSettings({
                name: LOGIN_ITEM_NAME,
                args: ['--hidden']
            });
            return settings.openAtLogin;
        } catch (err) {
            console.error('[login-item] get failed:', err);
            return false;
        }
    });

    ipcMain.handle('set-launch-at-login', (event, enabled) => {
        try {
            app.setLoginItemSettings({
                openAtLogin: Boolean(enabled),
                enabled: Boolean(enabled),
                name: LOGIN_ITEM_NAME,
                path: process.execPath,
                args: ['--hidden']
            });
            const verify = app.getLoginItemSettings({
                name: LOGIN_ITEM_NAME,
                args: ['--hidden']
            });
            console.log(`[login-item] set openAtLogin=${enabled}, verified=${verify.openAtLogin}`);
            if (Boolean(enabled) !== verify.openAtLogin) {
                throw new Error(`Registry write did not persist (wanted ${enabled}, got ${verify.openAtLogin})`);
            }
            return verify.openAtLogin;
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

    ipcMain.handle('export-profile', async (event, profile) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        const safeName = String(profile?.name || 'profile').replace(/[\\/:*?"<>|]/g, '_');
        const result = await dialog.showSaveDialog(win, {
            title: 'Export Profile',
            defaultPath: `${safeName}.remappr.json`,
            filters: [{ name: 'Remappr Profile', extensions: ['json'] }]
        });
        if (result.canceled || !result.filePath) return false;
        try {
            const payload = {
                remapprProfile: 1,
                name: profile.name,
                mappings: profile.mappings || []
            };
            fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2));
            return true;
        } catch (err) {
            console.error('[export-profile]', err);
            return false;
        }
    });

    ipcMain.handle('import-profile', async (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showOpenDialog(win, {
            title: 'Import Profile',
            filters: [{ name: 'Remappr Profile', extensions: ['json'] }],
            properties: ['openFile']
        });
        if (result.canceled || !result.filePaths?.length) return null;
        try {
            const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
            if (!data || typeof data.name !== 'string' || !Array.isArray(data.mappings)) {
                return { error: 'Invalid profile file' };
            }
            return { name: data.name, mappings: data.mappings };
        } catch (err) {
            console.error('[import-profile]', err);
            return { error: err.message };
        }
    });
}

module.exports = { setupIPC };
