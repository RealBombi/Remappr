const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');

class PythonBridge {
    constructor(mainWindow) {
        this.process = null;
        this.mainWindow = mainWindow;
    }

    start() {
        const isProd = app.isPackaged;
        const backendDir = path.join(__dirname, '..', 'backend');

        try {
            if (isProd) {
                // Production: use bundled .exe
                const exePath = path.join(process.resourcesPath, 'backend', 'backend.exe');
                this.process = spawn(exePath);
            } else {
                // Dev: run python directly (much more reliable)
                const scriptPath = path.join(backendDir, 'main.py');
                this.process = spawn('python', [scriptPath], {
                    cwd: backendDir
                });
            }

            this.process.stdout.on('data', (data) => {
                const messages = data.toString().split('\n').filter(Boolean);
                messages.forEach(msg => {
                    try {
                        const parsed = JSON.parse(msg);
                        console.log('[Python →]', JSON.stringify(parsed));
                        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                            this.mainWindow.webContents.send('python-event', parsed);
                        }
                    } catch (e) {
                        console.log('[Python stdout]', msg);
                    }
                });
            });

            this.process.stderr.on('data', (data) => {
                console.error('[Python stderr]', data.toString());
            });

            this.process.on('error', (err) => {
                console.error('[Python spawn error]', err.message);
            });

            this.process.on('close', (code) => {
                console.log(`[Python] process exited with code ${code}`);
            });

        } catch (err) {
            console.error('Failed to start python backend:', err);
        }
    }

    send(command) {
        if (this.process && this.process.stdin && !this.process.killed) {
            try {
                const msg = JSON.stringify(command) + '\n';
                console.log('[→ Python]', msg.trim());
                this.process.stdin.write(msg);
            } catch (e) {
                console.error('Failed to send command to Python:', e);
            }
        }
    }

    stop() {
        this.send({ type: 'exit' });
        if (this.process) {
            setTimeout(() => {
                if (this.process && !this.process.killed) this.process.kill();
            }, 500);
        }
    }
}

module.exports = PythonBridge;
