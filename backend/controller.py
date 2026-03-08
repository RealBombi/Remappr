import ctypes
import os

# Keep pygame only for controller name detection
os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
import pygame  # noqa: E402

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

TRIGGER_THRESHOLD = 30  # out of 255

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


def get_controller():
    """Return (player_index, name) for first connected XInput controller, or None."""
    state = XINPUT_STATE()
    for i in range(4):
        if _xinput.XInputGetState(i, ctypes.byref(state)) == 0:
            # Try to get a friendly name via pygame
            name = f"Controller {i + 1}"
            try:
                if not pygame.joystick.get_init():
                    pygame.joystick.init()
                if pygame.joystick.get_count() > 0:
                    name = pygame.joystick.Joystick(0).get_name()
            except Exception:
                pass
            return (i, name)
    return None


def rescan_controller():
    """Same as get_controller but refreshes pygame's joystick list first."""
    try:
        pygame.joystick.quit()
        pygame.joystick.init()
    except Exception:
        pass
    return get_controller()


class ControllerPoller:
    """Polls XInput state each tick.  Call ``poll()`` every ~10 ms."""

    def __init__(self, player_index, on_event, on_disconnect):
        self.player_index = player_index
        self.on_event = on_event
        self.on_disconnect = on_disconnect
        self.connected = True

        self._state = XINPUT_STATE()
        self._prev_buttons = 0
        self._prev_lt = False
        self._prev_rt = False

        # Read initial state so we don't fire spurious events on first poll
        if _xinput.XInputGetState(player_index, ctypes.byref(self._state)) == 0:
            self._prev_buttons = self._state.Gamepad.wButtons
            self._prev_lt = self._state.Gamepad.bLeftTrigger > TRIGGER_THRESHOLD
            self._prev_rt = self._state.Gamepad.bRightTrigger > TRIGGER_THRESHOLD

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
