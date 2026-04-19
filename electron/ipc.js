const { ipcMain, dialog, BrowserWindow } = require('electron');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const RUN_VALUE = 'Remappr';

function queryRunEntry() {
    try {
        execFileSync('reg', ['query', RUN_KEY, '/v', RUN_VALUE], {
            stdio: 'pipe',
            windowsHide: true
        });
        return true;
    } catch {
        return false;
    }
}

function writeRunEntry(enabled) {
    if (enabled) {
        const data = `"${process.execPath}" --hidden`;
        execFileSync('reg', ['add', RUN_KEY, '/v', RUN_VALUE, '/t', 'REG_SZ', '/d', data, '/f'], {
            stdio: 'pipe',
            windowsHide: true
        });
    } else {
        try {
            execFileSync('reg', ['delete', RUN_KEY, '/v', RUN_VALUE, '/f'], {
                stdio: 'pipe',
                windowsHide: true
            });
        } catch {
            // value didn't exist — fine
        }
    }
}

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
            return queryRunEntry();
        } catch (err) {
            console.error('[login-item] get failed:', err);
            return false;
        }
    });

    ipcMain.handle('set-launch-at-login', (event, enabled) => {
        try {
            writeRunEntry(Boolean(enabled));
            const verify = queryRunEntry();
            console.log(`[login-item] set openAtLogin=${enabled}, verified=${verify}`);
            if (Boolean(enabled) !== verify) {
                throw new Error(`Registry write did not persist (wanted ${enabled}, got ${verify})`);
            }
            return verify;
        } catch (err) {
            console.error('[login-item] set failed:', err);
            throw new Error(`Failed to update startup entry: ${err.message || err}`);
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
