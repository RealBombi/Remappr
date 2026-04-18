const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

function initAutoUpdater(mainWindow) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err == null ? 'unknown' : (err.stack || err).toString());
  });

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] checking for update');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[updater] update available:', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[updater] up to date');
  });

  autoUpdater.on('download-progress', (p) => {
    console.log(`[updater] downloading ${Math.round(p.percent)}%`);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: `Remappr ${info.version} has been downloaded.`,
      detail: 'Restart the app to apply the update.'
    });
    if (result.response === 0) {
      autoUpdater.quitAndInstall(true, true);
    }
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] initial check failed:', err.message);
  });

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 6 * 60 * 60 * 1000);
}

module.exports = { initAutoUpdater };
