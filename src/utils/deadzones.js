// Stick / trigger deadzones applied to the emulated controller.  Sticks are in
// XInput units (0..32767 from centre), triggers 0..255.  The backend fills
// the same defaults, so settings saved before deadzones existed still work.
export const DEFAULT_DEADZONES = {
    left: 2000,
    right: 2000,
    lt: 0,
    rt: 0
};

export const STICK_MAX = 32767;
export const TRIGGER_MAX = 255;

// One short of the full range: a deadzone covering everything would leave the
// stick with no usable travel at all.
export const DEADZONE_LIMITS = {
    left: STICK_MAX - 1,
    right: STICK_MAX - 1,
    lt: TRIGGER_MAX - 1,
    rt: TRIGGER_MAX - 1
};

// Below this a worn stick is likely to drift; mirrors Steam's warning.
export const LOW_STICK_DEADZONE = 1000;

export function deadzonesFor(settings) {
    return { ...DEFAULT_DEADZONES, ...(settings?.deadzones || {}) };
}

export function clampDeadzone(field, value) {
    const n = Number.parseInt(value, 10);
    if (Number.isNaN(n)) return DEFAULT_DEADZONES[field];
    return Math.min(DEADZONE_LIMITS[field], Math.max(0, n));
}
