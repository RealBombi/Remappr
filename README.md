# Remappr

Remap any controller button to any keyboard key. Create profiles, toggle mappings on the fly, and run it quietly in your system tray.

## The Story

This whole thing started because I was playing Rocket League with a custom controller and wanted a dedicated flip reset button. Turns out there's no simple tool to just map a controller button to a keyboard key without a bunch of bloat, so I built one myself.

## What Is It

Remappr is a lightweight Windows app that lets you map controller buttons (Xbox / XInput controllers) to keyboard keys. Press a button on your controller, and it sends the corresponding keyboard key to whatever game or app you're using.

**Features:**
- Map any controller button (A, B, X, Y, bumpers, triggers, d-pad, thumbsticks, etc.) to any keyboard key
- Create multiple profiles for different games or setups
- Enable/disable individual mappings without deleting them
- Runs in the system tray so it stays out of your way
- Clean UI to manage everything

## Disclaimer

**USE AT YOUR OWN RISK.** This tool simulates keyboard inputs based on controller button presses. Some games and online services may consider this a form of automation or macro usage, which could result in warnings, suspensions, or bans on your account.

**We are not responsible if you get banned.** By using Remappr, you accept full responsibility for any consequences. We built this for personal use and convenience — what you do with it is on you.

## How It Works

Remappr has two parts:

1. **Frontend (Electron + React)** — The app window where you manage your profiles and button mappings. Built with React and TailwindCSS, packaged as a desktop app with Electron.

2. **Backend (Python)** — A background process that does the actual work. It reads your controller input using the Windows XInput API (the same API games use to read Xbox controllers) and simulates keyboard key presses using `pynput`. The frontend and backend talk to each other over a local bridge.

**The flow:**
1. You plug in your controller
2. Remappr detects it via XInput
3. You set up mappings (e.g. "Left Bumper → F" or "Right Trigger → Space")
4. The Python backend polls your controller ~100 times per second
5. When you press a mapped button, it instantly sends the keyboard key

It does not modify any game files, inject into processes, or touch memory. It just reads controller state and presses keyboard keys — same as if you physically pressed them.

## Installation

1. Go to the [Releases](https://github.com/RealBombi/Remappr/releases) page
2. Download **Remappr Setup 1.0.0.exe**
3. Run the installer

> **Note:** Windows SmartScreen may show a warning since the app isn't code-signed. Click **"More info"** then **"Run anyway"** to proceed.

> **Tip:** If a game isn't picking up the simulated key presses, try running Remappr as Administrator.

## License

This project uses a non-commercial license. You're free to download, use, and modify it for personal use, but you **cannot sell it or use it commercially** without permission. See [LICENSE](LICENSE) for details.
