const { Tray, Menu, app, nativeImage } = require('electron');
const path = require('path');

let tray = null;

function createTray(mainWindow) {
    const iconPath = app.isPackaged
        ? path.join(process.resourcesPath, 'assets', 'icon.ico')
        : path.join(__dirname, '..', 'assets', 'icon.ico');

    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show App',
            click: () => mainWindow.show()
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Remappr');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        mainWindow.show();
    });
}

module.exports = { createTray };
