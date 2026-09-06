import ctypes
import os

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
import pygame  # noqa: E402

try:
    from pygame._sdl2 import controller as sdl_controller  # noqa: E402
except ImportError:
    # Older pygame builds ship without the SDL game-controller binding.
    # XInput still works; non-XInput pads (DualSense) simply won't be found.
    sdl_controller = None

# ── Shared button vocabulary ──────────────────────────
#
# Both backends emit the same BTN_* names so a profile made on an Xbox pad
# works on a DualSense and vice versa.  The UI translates the names into
# per-brand labels (BTN_A → "A" or "CROSS") at render time.

TRIGGER_THRESHOLD = 30  # out of 255

# ── XInput via ctypes ─────────────────────────────────


class XINPUT_GAMEPAD(ctypes.Structure):
    _fields_ = [
        ("wButtons", ctypes.c_ushort),
        ("bLeftTrigger", ctypes.c_ubyte),
        ("bRightTrigger", ctypes.c_ubyte),
        ("sThumbLX", ctypes.c_short),
        ("sThumbLY", ctypes.c_short),
        ("sThumbRX", ctypes.c_short),
        ("sThumbRY", ctypes.c_short),
    ]


class XINPUT_STATE(ctypes.Structure):
    _fields_ = [
        ("dwPacketNumber", ctypes.c_uint),
        ("Gamepad", XINPUT_GAMEPAD),
    ]


try:
    _xinput = ctypes.windll.xinput1_4
except OSError:
    _xinput = ctypes.windll.xinput9_1_0

XINPUT_BUTTONS = [
    (0x0001, "BTN_DPAD_UP"),
    (0x0002, "BTN_DPAD_DOWN"),
    (0x0004, "BTN_DPAD_LEFT"),
    (0x0008, "BTN_DPAD_RIGHT"),
    (0x0010, "BTN_START"),
    (0x0020, "BTN_BACK"),
    (0x0040, "BTN_L_THUMB"),
    (0x0080, "BTN_R_THUMB"),
    (0x0100, "BTN_LB"),
    (0x0200, "BTN_RB"),
    (0x0400, "BTN_GUIDE"),
    (0x1000, "BTN_A"),
    (0x2000, "BTN_B"),
    (0x4000, "BTN_X"),
    (0x8000, "BTN_Y"),
]

# ── SDL game controller (DualSense & other non-XInput pads) ──
#
# Windows does not expose a DualSense through XInput at all, so PS5 pads are
# invisible to the block above.  SDL ships a dedicated DualSense driver (USB
# and Bluetooth) and normalises every pad onto one layout, which is what makes
# the shared BTN_* names possible.

# pygame exposes the standard buttons as constants but not the trailing few,
# so the PlayStation-only extras are spelled out from the SDL enum.
SDL_BUTTON_MIC = 15       # SDL_CONTROLLER_BUTTON_MISC1 — DualSense mute/mic key
SDL_BUTTON_TOUCHPAD = 20  # SDL_CONTROLLER_BUTTON_TOUCHPAD

# SDL reports triggers as 0‥32767 where XInput uses 0‥255; scale so both
# backends break at the same physical point on the trigger travel.
SDL_TRIGGER_THRESHOLD = int(32767 * TRIGGER_THRESHOLD / 255)

SONY_VENDOR_ID = 0x054C

# Sony pads on the generic HID path report plain "Wireless Controller", so the
# name is checked as well as the vendor id.
PLAYSTATION_NAME_HINTS = (
    "dualsense",
    "dualshock",
    "playstation",
    "ps5",
    "ps4",
    "ps3",
    "wireless controller",
)


SDL_PLAYSTATION_EXTRA_BUTTONS = [
    (SDL_BUTTON_TOUCHPAD, "BTN_TOUCHPAD"),
    (SDL_BUTTON_MIC, "BTN_MIC"),
]

# SDL's XInput and RawInput drivers synthesise the guide button and get it
# wrong — it can read stuck-on, which would hold a mapped key down forever.
# Both only ever back XInput-capable pads, and those take the XInput path
# anyway; everything that actually reaches SdlPoller (a DualSense on HIDAPI)
# reads the button straight off the device.
SDL_UNTRUSTED_GUIDE_DRIVERS = ("x", "r")


def _sdl_buttons(layout, driver):
    """Button table for an SDL pad: the shared set, plus what the pad has."""
    buttons = [
        (pygame.CONTROLLER_BUTTON_DPAD_UP, "BTN_DPAD_UP"),
        (pygame.CONTROLLER_BUTTON_DPAD_DOWN, "BTN_DPAD_DOWN"),
        (pygame.CONTROLLER_BUTTON_DPAD_LEFT, "BTN_DPAD_LEFT"),
        (pygame.CONTROLLER_BUTTON_DPAD_RIGHT, "BTN_DPAD_RIGHT"),
        (pygame.CONTROLLER_BUTTON_START, "BTN_START"),
        (pygame.CONTROLLER_BUTTON_BACK, "BTN_BACK"),
        (pygame.CONTROLLER_BUTTON_LEFTSTICK, "BTN_L_THUMB"),
        (pygame.CONTROLLER_BUTTON_RIGHTSTICK, "BTN_R_THUMB"),
        (pygame.CONTROLLER_BUTTON_LEFTSHOULDER, "BTN_LB"),
        (pygame.CONTROLLER_BUTTON_RIGHTSHOULDER, "BTN_RB"),
        (pygame.CONTROLLER_BUTTON_A, "BTN_A"),
        (pygame.CONTROLLER_BUTTON_B, "BTN_B"),
        (pygame.CONTROLLER_BUTTON_X, "BTN_X"),
        (pygame.CONTROLLER_BUTTON_Y, "BTN_Y"),
    ]
    if driver not in SDL_UNTRUSTED_GUIDE_DRIVERS:
        buttons.append((pygame.CONTROLLER_BUTTON_GUIDE, "BTN_GUIDE"))
    if layout == "playstation":
        buttons += SDL_PLAYSTATION_EXTRA_BUTTONS
    return buttons


def _guid_driver(guid):
    """Which SDL driver backs the pad — "h" hidapi, "x" xinput, "r" rawinput."""
    try:
        return chr(int(guid[28:30], 16))
    except (TypeError, ValueError):
        return ""


def _guid_vendor(guid):
    """USB vendor id out of an SDL joystick GUID (bytes 4-5, little endian)."""
    try:
        return int(guid[10:12] + guid[8:10], 16)
    except (TypeError, ValueError):
        return 0


def _detect_layout(guid, name):
    """Pick the label set for a pad: "playstation" or "xbox"."""
    if _guid_vendor(guid) == SONY_VENDOR_ID:
        return "playstation"
    lowered = (name or "").lower()
    # Checked before the hints below, which an "Xbox Wireless Controller"
    # would otherwise trip on.
    if "xbox" in lowered:
        return "xbox"
    if any(hint in lowered for hint in PLAYSTATION_NAME_HINTS):
        return "playstation"
    return "xbox"


# ── Device discovery ──────────────────────────────────


class ControllerDevice:
    """A connected pad: what to call it, and how to open a poller for it."""

    def __init__(self, source, index, name, layout, driver=""):
        self.source = source  # "xinput" | "sdl"
        self.index = index
        self.name = name
        self.layout = layout  # "xbox" | "playstation"
        self.driver = driver  # SDL driver signature, see _guid_driver

    def open(self, on_event, on_disconnect):
        if self.source == "sdl":
            return SdlPoller(
                self.index, self.layout, self.driver, on_event, on_disconnect
            )
        return XInputPoller(self.index, on_event, on_disconnect)


def _ensure_sdl():
    """Bring up the SDL subsystems the pad code needs.

    ``pygame.event.pump()`` is what refreshes device state and delivers
    hotplug notifications, and it needs the video subsystem — hence the dummy
    video driver set at import time.  Doing this here rather than relying on
    the caller keeps the SDL path working whoever imports the module.
    """
    if not pygame.display.get_init():
        pygame.display.init()
    if not pygame.joystick.get_init():
        pygame.joystick.init()
    if sdl_controller is not None and not sdl_controller.get_init():
        sdl_controller.init()


def _sdl_joysticks():
    """(index, joystick) for every pad SDL can see, or nothing on failure."""
    try:
        _ensure_sdl()
        # SDL learns about hotplugged pads off the event queue, so without a
        # pump it never notices anything connected since the last scan.
        pygame.event.pump()
        return [
            (i, pygame.joystick.Joystick(i))
            for i in range(pygame.joystick.get_count())
        ]
    except Exception:
        return []


def _xinput_name():
    """Friendly name for an XInput pad, via SDL's device list.

    Skips anything that looks like a PlayStation pad so a DualSense sitting
    alongside an Xbox pad doesn't lend the Xbox pad its name.
    """
    fallback = None
    for _, joy in _sdl_joysticks():
        try:
            name = joy.get_name()
            if _detect_layout(joy.get_guid(), name) != "playstation":
                return name
            if fallback is None:
                fallback = name
        except Exception:
            continue
    return fallback


def _get_xinput_controller():
    state = XINPUT_STATE()
    for i in range(4):
        if _xinput.XInputGetState(i, ctypes.byref(state)) == 0:
            name = _xinput_name() or f"Controller {i + 1}"
            return ControllerDevice("xinput", i, name, "xbox")
    return None


def _get_sdl_controller():
    """First pad SDL has a game-controller mapping for (DualSense, etc.)."""
    if sdl_controller is None:
        return None
    for i, joy in _sdl_joysticks():
        try:
            if not sdl_controller.is_controller(i):
                continue
            guid = joy.get_guid()
            name = joy.get_name()
            return ControllerDevice(
                "sdl", i, name, _detect_layout(guid, name), _guid_driver(guid)
            )
        except Exception:
            continue
    return None


def get_controller():
    """First connected pad as a ControllerDevice, or None.

    XInput is tried first so Xbox pads keep the low-latency native path; SDL
    picks up everything Windows won't route through XInput, DualSense included.
    """
    return _get_xinput_controller() or _get_sdl_controller()


def rescan_controller():
    """Same as get_controller but refreshes SDL's device list first."""
    try:
        if sdl_controller is not None and sdl_controller.get_init():
            sdl_controller.quit()
        pygame.joystick.quit()
        _ensure_sdl()
    except Exception:
        pass
    return get_controller()


# ── Pollers ───────────────────────────────────────────


class XInputPoller:
    """Polls XInput state each tick.  Call ``poll()`` every ~10 ms."""

    def __init__(self, player_index, on_event, on_disconnect):
        self.player_index = player_index
        self.on_event = on_event
        self.on_disconnect = on_disconnect
        self.connected = True

        self._state = XINPUT_STATE()
        # Start with zeroed previous state so the first poll() picks up
        # any buttons already held.  This is safer than snapshotting the
        # current state, which may be stale or transitional after a
        # micro-disconnect / reconnect.
        self._prev_buttons = 0
        self._prev_lt = False
        self._prev_rt = False

    def poll(self):
        result = _xinput.XInputGetState(
            self.player_index, ctypes.byref(self._state)
        )
        if result != 0:
            # Controller disconnected
            self.connected = False
            self.on_disconnect()
            return

        gp = self._state.Gamepad

        # ── Digital buttons ──
        btns = gp.wButtons
        changed = btns ^ self._prev_buttons
        if changed:
            for mask, name in XINPUT_BUTTONS:
                if changed & mask:
                    self.on_event(name, bool(btns & mask))
            self._prev_buttons = btns

        # ── Left trigger ──
        lt_pressed = gp.bLeftTrigger > TRIGGER_THRESHOLD
        if lt_pressed != self._prev_lt:
            self._prev_lt = lt_pressed
            self.on_event("BTN_LT", lt_pressed)

        # ── Right trigger ──
        rt_pressed = gp.bRightTrigger > TRIGGER_THRESHOLD
        if rt_pressed != self._prev_rt:
            self._prev_rt = rt_pressed
            self.on_event("BTN_RT", rt_pressed)


class SdlPoller:
    """Polls an SDL game controller.  Call ``poll()`` every ~10 ms."""

    def __init__(self, device_index, layout, driver, on_event, on_disconnect):
        self.on_event = on_event
        self.on_disconnect = on_disconnect
        self.connected = True

        _ensure_sdl()
        self._pad = sdl_controller.Controller(device_index)
        self._buttons = _sdl_buttons(layout, driver)

        # Zeroed previous state, for the same reason as XInputPoller.
        self._prev = {name: False for _, name in self._buttons}
        self._prev_lt = False
        self._prev_rt = False

    def poll(self):
        # SDL only refreshes pad state while the event queue is pumped, and
        # the queue has to be drained or it fills up and starts dropping.
        pygame.event.pump()
        pygame.event.clear()

        if not self._pad.attached():
            # Controller disconnected
            self.connected = False
            self._close()
            self.on_disconnect()
            return

        # ── Digital buttons ──
        for index, name in self._buttons:
            pressed = bool(self._pad.get_button(index))
            if pressed != self._prev[name]:
                self._prev[name] = pressed
                self.on_event(name, pressed)

        # ── Left trigger ──
        lt_pressed = (
            self._pad.get_axis(pygame.CONTROLLER_AXIS_TRIGGERLEFT)
            > SDL_TRIGGER_THRESHOLD
        )
        if lt_pressed != self._prev_lt:
            self._prev_lt = lt_pressed
            self.on_event("BTN_LT", lt_pressed)

        # ── Right trigger ──
        rt_pressed = (
            self._pad.get_axis(pygame.CONTROLLER_AXIS_TRIGGERRIGHT)
            > SDL_TRIGGER_THRESHOLD
        )
        if rt_pressed != self._prev_rt:
            self._prev_rt = rt_pressed
            self.on_event("BTN_RT", rt_pressed)

    def _close(self):
        """Release the SDL handle so a reconnect can claim the pad again."""
        try:
            self._pad.quit()
        except Exception:
            pass
