# Remappr — Requirements & Design Manual (RDM)

## 1. Project Overview

**Remappr** is a free, open-source desktop application for Windows that maps extra controller buttons (like R5, L5, R4, L4, back paddles) to keyboard keys. It's built for gamers who need extra binds in games like Rocket League, where the game accepts both controller and keyboard input simultaneously but doesn't natively detect extra buttons on third-party controllers.

### The Problem
- Controllers like the GameSir G7 Pro, PowerA Advantage, and others have extra buttons (R5, L5, R4, L4, back paddles)
- Many games (Rocket League, Fortnite, Apex Legends, etc.) don't detect these extra buttons natively
- The controller's own software (e.g., GameSir Nexus) can map buttons to keyboard keys, but games ignore those key presses because they come from a controller device, not a real keyboard
- Existing solutions like reWASD cost money ($7+), and JoyToKey is dated and clunky

### The Solution
Remappr sits between the controller and the game at the OS/driver level. When the user presses an extra controller button, the app intercepts it and sends a real keyboard keypress that Windows and games treat as an actual keyboard input.

### Target Users
- Rocket League players who want stall binds, speed flip macros, etc.
- Any PC gamer using a controller with extra buttons that their game doesn't detect
- Users of GameSir G7 series, PowerA, Thrustmaster eSwap, and similar controllers

---

## 2. Core Architecture

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend (UI) | Electron + React | Modern look, easy to style, huge ecosystem, beginner-friendly |
| Styling | Tailwind CSS | Fast, utility-first, clean dark UI |
| Backend (input handling) | Python (.exe via PyInstaller) | Already proven to work for controller input reading and keyboard sending |
| Controller reading | `inputs` Python library | Lightweight, works with Python 3.14, detects extra buttons |
| Keyboard sending | `pynput` Python library | Sends real keyboard events at OS level |
| Packaging | electron-builder | Creates a single .exe installer for distribution |
| Python bundling | PyInstaller | Bundles Python backend into standalone .exe (no Python install needed for end user) |

### How It Works (Data Flow)

```
User presses R5 on controller
        ↓
Python backend (running as child process) detects button press via `inputs` library
        ↓
Python backend sends keyboard key "J" via `pynput`
        ↓
Windows receives a real keyboard event
        ↓
Game (Rocket League) picks up the "J" keypress
        ↓
Stall bind triggers in-game
```

### Process Architecture

```
Remappr (Electron app)
├── Main Process (Node.js)
│   ├── Manages app window, tray icon, auto-start
│   ├── Spawns and communicates with Python backend
│   └── Reads/writes config files (JSON)
├── Renderer Process (React UI)
│   ├── Shows controller visualization
│   ├── Handles mapping UI (click button → assign key)
│   └── Communicates with Main Process via IPC
└── Python Backend (child process / bundled .exe)
    ├── Reads controller input via `inputs`
    ├── Sends keyboard events via `pynput`
    └── Communicates with Electron via stdin/stdout JSON messages
```

### Communication Protocol (Electron ↔ Python)

The Electron main process and Python backend communicate via stdin/stdout using JSON messages:

**Electron → Python (commands):**
```json
{ "type": "start", "mappings": [{ "button": "BTN_START", "key": "j" }] }
{ "type": "stop" }
{ "type": "detect" }
{ "type": "update_mappings", "mappings": [...] }
```

**Python → Electron (events):**
```json
{ "type": "controller_connected", "name": "Microsoft X-Box 360 pad" }
{ "type": "controller_disconnected" }
{ "type": "button_detected", "button": "BTN_START" }
{ "type": "button_pressed", "button": "BTN_START", "key": "j" }
{ "type": "button_released", "button": "BTN_START", "key": "j" }
{ "type": "error", "message": "No controller found" }
```

---

## 3. Features

### v1.0 — MVP (Minimum Viable Product)

#### 3.1 Controller Detection
- Auto-detect connected controllers on startup
- Show controller name in the UI (e.g., "Microsoft X-Box 360 pad")
- Show connected/disconnected status with indicator (green dot = connected, red = disconnected)
- Handle controller disconnect/reconnect gracefully without crashing

#### 3.2 Button Mapping
- User clicks "Add Mapping" button
- UI shows "Press a button on your controller..."
- User presses the extra button (R5, L5, R4, L4, etc.)
- App detects which button was pressed and shows it
- User then presses a key on their keyboard OR selects from a dropdown
- Mapping is saved: Button X → Key Y
- Support multiple simultaneous mappings (e.g., R5 → J, L5 → K, R4 → L)
- Each mapping can be individually enabled/disabled with a toggle
- Each mapping can be deleted

#### 3.3 Mapping Targets
- Any keyboard key (A-Z, 0-9, F1-F12, arrow keys, space, enter, shift, ctrl, alt, etc.)
- Mouse buttons (left click, right click, middle click) — stretch goal for v1
- Other controller buttons (remap R5 to act like A button) — v2 feature

#### 3.4 System Tray
- App minimizes to system tray (not taskbar) when closed
- Tray icon shows status (active / paused)
- Right-click tray menu: "Show", "Pause/Resume", "Quit"
- Double-click tray icon opens the main window

#### 3.5 Profiles
- Save/load different mapping profiles
- Name profiles (e.g., "Rocket League", "Fortnite", "Default")
- Quick switch between profiles from tray menu
- One profile active at a time

#### 3.6 Settings
- Start with Windows (toggle)
- Start minimized to tray (toggle)
- Default profile selection
- Minimize to tray on close (toggle)

#### 3.7 Config Storage
- All settings and profiles stored in a JSON file
- Location: `%APPDATA%/KeyBindPro/config.json`
- Example config structure:

```json
{
  "settings": {
    "startWithWindows": false,
    "startMinimized": false,
    "minimizeToTray": true,
    "defaultProfile": "rocket-league"
  },
  "profiles": [
    {
      "id": "rocket-league",
      "name": "Rocket League",
      "mappings": [
        {
          "id": "mapping-1",
          "button": "BTN_START",
          "buttonLabel": "R5",
          "key": "j",
          "keyLabel": "J",
          "enabled": true
        }
      ]
    }
  ]
}
```

### v2.0 — Future Features (Do NOT build yet)

- Controller-to-controller remapping (R5 → A button)
- Macro support (one button triggers a sequence of timed keypresses)
- Per-game auto-profile switching (detect which game is running)
- On-screen overlay showing active mappings
- Controller visualization (visual diagram showing mapped buttons)
- Multi-controller support (two controllers at once)
- Import/export profiles (share with friends)
- Auto-updater
- Linux and macOS support

---

## 4. UI Design

### Design Principles
- **Dark theme** — gamers prefer dark UI, similar to Discord/Steam aesthetic
- **Minimal and clean** — not cluttered, easy to understand at a glance
- **One-page app** — no complex navigation, everything on one screen with a settings modal
- **Status at a glance** — user should immediately see: controller connected? Mappings active?

### Color Palette

| Element | Color | Hex |
|---------|-------|-----|
| Background (main) | Very dark gray | `#0f0f0f` |
| Background (cards) | Dark gray | `#1a1a1a` |
| Background (inputs/hover) | Medium dark gray | `#252525` |
| Accent / primary | Vibrant purple or blue | `#7c3aed` or `#3b82f6` |
| Accent hover | Lighter variant | `#8b5cf6` or `#60a5fa` |
| Text primary | White | `#ffffff` |
| Text secondary | Light gray | `#a0a0a0` |
| Success / connected | Green | `#22c55e` |
| Error / disconnected | Red | `#ef4444` |
| Warning | Amber | `#f59e0b` |
| Border | Subtle dark | `#2a2a2a` |

### Typography
- Font: Inter or system font stack
- Headings: Bold, 18-24px
- Body: Regular, 14px
- Small/labels: 12px, secondary color

### Main Window Layout

```
┌─────────────────────────────────────────────────┐
│  🎮 Remappr              — □ ✕             │  ← Title bar (custom, draggable)
├─────────────────────────────────────────────────┤
│                                                  │
│  Controller: Xbox 360 pad  🟢 Connected          │  ← Status bar
│                                                  │
│  Profile: [Rocket League ▾]  [+ New]             │  ← Profile selector
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  MAPPINGS                                  │  │
│  │                                            │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  🎮 R5  ──→  ⌨️ J      [✓] [🗑]   │  │  │  ← Mapping row (toggle + delete)
│  │  └─────────────────────────────────────┘  │  │
│  │                                            │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  🎮 L5  ──→  ⌨️ K      [✓] [🗑]   │  │  │  ← Another mapping
│  │  └─────────────────────────────────────┘  │  │
│  │                                            │  │
│  │  [ + Add Mapping ]                         │  │  ← Add button
│  │                                            │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  [⚙ Settings]                    [▶ Active]     │  ← Bottom bar
│                                                  │
└─────────────────────────────────────────────────┘
```

### Add Mapping Flow

1. User clicks "+ Add Mapping"
2. Modal appears: "Press a button on your controller..."
3. User presses R5 → modal updates: "Got it! R5 detected"
4. Modal changes to: "Now press a key on your keyboard..."
5. User presses J → modal updates: "R5 → J"
6. User clicks "Save" → mapping appears in the list

### Settings Modal

```
┌────────────────────────────────┐
│  ⚙ Settings                 ✕ │
│                                │
│  General                       │
│  ┌ Start with Windows    [  ] │
│  ┌ Start minimized       [  ] │
│  ┌ Minimize to tray      [✓] │
│                                │
│  Default Profile               │
│  [ Rocket League         ▾ ]  │
│                                │
│  About                         │
│  Remappr v1.0.0            │
│  github.com/yourname/keybindpro│
│                                │
│           [ Save ]             │
└────────────────────────────────┘
```

---

## 5. Project Structure

```
remappr/
├── package.json                  # Electron + React dependencies
├── electron/
│   ├── main.js                   # Electron main process
│   ├── tray.js                   # System tray logic
│   ├── ipc.js                    # IPC handlers (talk to renderer)
│   └── python-bridge.js          # Spawn and communicate with Python backend
├── src/                          # React frontend
│   ├── App.jsx                   # Main app component
│   ├── index.html                # Entry HTML
│   ├── index.css                 # Tailwind imports
│   ├── components/
│   │   ├── StatusBar.jsx         # Controller connection status
│   │   ├── ProfileSelector.jsx   # Profile dropdown + new profile
│   │   ├── MappingList.jsx       # List of all mappings
│   │   ├── MappingRow.jsx        # Single mapping (button → key, toggle, delete)
│   │   ├── AddMappingModal.jsx   # Step-by-step mapping creation
│   │   └── SettingsModal.jsx     # Settings panel
│   ├── hooks/
│   │   ├── useController.js      # Controller state hook
│   │   └── useProfiles.js        # Profile management hook
│   └── utils/
│       └── ipc.js                # Renderer-side IPC helpers
├── backend/
│   ├── main.py                   # Python backend entry point
│   ├── controller.py             # Controller input reading
│   ├── keyboard_sender.py        # Keyboard event sending
│   └── protocol.py               # JSON message protocol
├── assets/
│   ├── icon.ico                  # App icon
│   ├── icon.png                  # App icon (PNG)
│   └── tray-icon.png             # Tray icon
├── build/                        # Build configs
│   └── electron-builder.yml      # Packaging config
└── README.md                     # Public-facing README
```

---

## 6. Python Backend Detail

### main.py — Entry Point

The Python backend runs as a child process spawned by Electron. It:

1. Listens for JSON commands on **stdin**
2. Sends JSON events on **stdout**
3. Runs a main loop that reads controller input and sends keyboard events

**Key behaviors:**
- On startup: scan for controllers, report connected controller
- On "detect" command: enter detection mode, report next button press
- On "start" command: begin mapping loop with provided mappings
- On "stop" command: pause mapping (release any held keys)
- On "update_mappings" command: hot-swap mappings without stopping
- Poll at 1ms intervals for low latency
- Handle controller disconnect gracefully (report to Electron, wait for reconnect)

### controller.py — Input Reading

```python
# Core detection logic
import inputs

def get_controller():
    """Returns first connected gamepad or None"""
    gamepads = inputs.devices.gamepads
    return gamepads[0] if gamepads else None

def read_events(gamepad):
    """Generator that yields button press/release events"""
    for event in gamepad.read():
        if event.ev_type == "Key":
            yield {
                "button": event.code,
                "pressed": event.state == 1
            }
```

### keyboard_sender.py — Key Sending

```python
from pynput.keyboard import Controller, Key

keyboard = Controller()

# Map string key names to pynput keys
KEY_MAP = {
    "a": "a", "b": "b", ..., "z": "z",
    "0": "0", ..., "9": "9",
    "f1": Key.f1, ..., "f12": Key.f12,
    "space": Key.space,
    "enter": Key.enter,
    "shift": Key.shift,
    "ctrl": Key.ctrl_l,
    "alt": Key.alt_l,
    "up": Key.up, "down": Key.down,
    "left": Key.left, "right": Key.right,
    "tab": Key.tab, "escape": Key.esc,
}

def press_key(key_name):
    key = KEY_MAP.get(key_name.lower(), key_name)
    keyboard.press(key)

def release_key(key_name):
    key = KEY_MAP.get(key_name.lower(), key_name)
    keyboard.release(key)
```

---

## 7. Electron Main Process Detail

### python-bridge.js — Spawning Python

```javascript
const { spawn } = require('child_process');
const path = require('path');

class PythonBridge {
    constructor() {
        this.process = null;
        this.onMessage = null;
    }

    start() {
        // In dev: run python directly
        // In production: run bundled .exe
        const isProd = app.isPackaged;
        const backendPath = isProd
            ? path.join(process.resourcesPath, 'backend', 'backend.exe')
            : path.join(__dirname, '..', 'backend', 'main.py');

        this.process = isProd
            ? spawn(backendPath)
            : spawn('python', [backendPath]);

        this.process.stdout.on('data', (data) => {
            const messages = data.toString().split('\n').filter(Boolean);
            messages.forEach(msg => {
                try {
                    const parsed = JSON.parse(msg);
                    if (this.onMessage) this.onMessage(parsed);
                } catch (e) { /* ignore non-JSON output */ }
            });
        });
    }

    send(command) {
        this.process.stdin.write(JSON.stringify(command) + '\n');
    }

    stop() {
        this.send({ type: 'stop' });
        this.process.kill();
    }
}
```

---

## 8. Build & Distribution

### Development Setup

```bash
# Clone the repo
git clone https://github.com/yourname/remappr
cd remappr

# Install Node dependencies
npm install

# Install Python dependencies
pip install inputs pynput

# Run in dev mode
npm run dev
```

### Building for Release

```bash
# Bundle Python backend into .exe
cd backend
pyinstaller --onefile --name backend main.py
cd ..

# Build Electron app + installer
npm run build
```

### electron-builder.yml

```yaml
appId: com.keybindpro.app
productName: Remappr
directories:
  output: dist
files:
  - "build/**/*"
  - "electron/**/*"
extraResources:
  - from: "backend/dist/backend.exe"
    to: "backend/backend.exe"
win:
  target: nsis
  icon: assets/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
```

### What the End User Gets
- A single `.exe` installer (around 80-120MB)
- Installs like any normal Windows app
- No Python required on their machine
- No command line needed
- Just install, open, map buttons, play

---

## 9. Important Technical Considerations

### Anti-Cheat Compatibility
- The app uses `pynput` which sends keyboard events via standard Windows APIs
- This is the same method used by reWASD, JoyToKey, and AutoHotKey
- Games with Easy Anti-Cheat (EAC) and BattlEye generally allow this type of input remapping
- The app does NOT modify game files, inject DLLs, or hook into game processes
- **Test with these games**: Rocket League (EAC), Fortnite (EAC), Apex Legends (EAC)

### Input Latency
- The Python backend polls at 1ms intervals
- `pynput` sends keys via Windows SendInput API which is near-instant
- Total expected latency: <5ms (imperceptible for gaming)
- For comparison: reWASD advertises <1ms but real-world is similar

### Admin Privileges
- Some games running in elevated/fullscreen mode may require the app to run as administrator
- Add a "Run as Administrator" option/tip in the app
- Include a manifest in the .exe that requests admin if needed

### Controller Compatibility
- The `inputs` library works with any XInput/DirectInput controller on Windows
- Tested with: GameSir G7 Pro HE, should work with PowerA, Thrustmaster, Scuf, etc.
- Extra buttons may show up with different internal names (BTN_START, BTN_SELECT, BTN_THUMBL, etc.) but the auto-detect handles this

### Edge Cases to Handle
- Controller unplugged during gameplay → pause mappings, show notification, auto-resume on reconnect
- Multiple controllers connected → let user pick which one to use
- User maps a button that conflicts with an existing mapping → warn and overwrite
- App is already running and user launches again → focus existing window instead of opening a second instance
- Key is held when app is stopped → release all held keys before exiting

---

## 10. Development Phases

### Phase 1: Core Backend (Week 1)
- [ ] Set up Python backend with stdin/stdout JSON protocol
- [ ] Controller detection and event reading
- [ ] Keyboard key sending
- [ ] Bundle Python into .exe with PyInstaller
- [ ] Test: R5 → J works in Rocket League

### Phase 2: Electron Shell (Week 2)
- [ ] Set up Electron + React + Tailwind project
- [ ] Create main window with custom title bar
- [ ] Implement system tray with basic menu
- [ ] Spawn Python backend as child process
- [ ] Establish Electron ↔ Python communication

### Phase 3: UI — Mapping Interface (Week 3)
- [ ] Controller status display
- [ ] Mapping list (add, delete, toggle)
- [ ] Add Mapping modal (detect button → assign key)
- [ ] Profile selector (create, switch, delete)

### Phase 4: Settings & Polish (Week 4)
- [ ] Settings modal (start with Windows, minimize to tray, etc.)
- [ ] Config file save/load
- [ ] App icon and branding
- [ ] Error handling and edge cases
- [ ] Single-instance enforcement

### Phase 5: Build & Release (Week 5)
- [ ] Package with electron-builder
- [ ] Test installer on clean Windows machine
- [ ] Write public README with screenshots
- [ ] Create GitHub release
- [ ] Post on Reddit (r/RocketLeague, r/gamedev, etc.)

---

## 11. File Naming and Conventions

- **React components**: PascalCase (`MappingRow.jsx`)
- **Utilities/hooks**: camelCase (`useController.js`)
- **Python files**: snake_case (`keyboard_sender.py`)
- **CSS**: Tailwind utility classes (no separate CSS files)
- **Config/data**: JSON
- **Git branch model**: `main` for releases, `dev` for development

---

## 12. Summary for AI Assistant

When building this project, here's what you need to know:

1. **This is a desktop app** built with Electron (React frontend) + Python (backend)
2. **The Python part is already working** — see the `r5_to_j.py` script as a reference
3. **The frontend talks to the Python backend** via spawning it as a child process and sending JSON messages over stdin/stdout
4. **The UI should look modern and dark** — think Discord/Steam aesthetic
5. **v1 is simple**: detect controller, map buttons to keys, save profiles, system tray
6. **Don't over-engineer** — keep it simple, one thing done well
7. **Target audience**: gamers, mainly Rocket League players who need stall binds
8. **Distribution**: single .exe installer, no Python needed for end users
9. **The app name is Remappr** (open to change)

