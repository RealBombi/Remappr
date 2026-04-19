// Very simple IPC wrapper for the renderer process
// If we are in browser ( Vite dev outside electron), this will degrade gracefully or mock

let ipcRenderer = null;

if (window.require) {
    try {
        const electron = window.require('electron');
        ipcRenderer = electron.ipcRenderer;
    } catch (e) {
        console.warn("Could not load ipcRenderer");
    }
}

export function sendCommand(command) {
    if (ipcRenderer) {
        ipcRenderer.send('python-cmd', command);
    } else {
        console.log("[Mock IPC] Send Python Command:", command);
    }
}

export function minimizeWindow() {
    if (ipcRenderer) ipcRenderer.send('window-minimize');
}

export function closeWindow() {
    if (ipcRenderer) ipcRenderer.send('window-close');
}

export function onPythonEvent(callback) {
    if (ipcRenderer) {
        const listener = (event, data) => callback(data);
        ipcRenderer.on('python-event', listener);
        return () => {
            ipcRenderer.removeListener('python-event', listener);
        };
    } else {
        // Mock
        console.log("[Mock IPC] Subscribed to Python events");
        return () => { };
    }
}

export async function loadConfig() {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('load-config');
    }
    return null;
}

export async function saveConfig(config) {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('save-config', config);
    }
    return false;
}

export async function getAppVersion() {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('get-app-version');
    }
    return 'dev';
}

export async function getLaunchAtLogin() {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('get-launch-at-login');
    }
    return false;
}

export async function setLaunchAtLogin(enabled) {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('set-launch-at-login', enabled);
    }
    return false;
}

export async function exportProfile(profile) {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('export-profile', profile);
    }
    return false;
}

export async function importProfile() {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('import-profile');
    }
    return null;
}
