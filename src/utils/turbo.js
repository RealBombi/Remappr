// Hold-to-repeat settings carried on each mapping.  The backend fills the
// same defaults for mappings saved before turbo existed, so a missing block
// simply means "off".
export const DEFAULT_TURBO = {
    enabled: false,
    rate: 80,          // ms between repeated presses
    startDelay: 0,     // ms the button is held before repeating begins
    endDelay: 0,       // ms repeating continues after the button is released
    toggle: false,     // press once to start repeating, press again to stop
    interruptable: true // releasing the button stops repeating at once
};

export const TURBO_LIMITS = {
    rate: { min: 10, max: 5000 },
    startDelay: { min: 0, max: 10000 },
    endDelay: { min: 0, max: 10000 }
};

export function turboFor(mapping) {
    return { ...DEFAULT_TURBO, ...(mapping.turbo || {}) };
}

export function clampTurboValue(field, value) {
    const limits = TURBO_LIMITS[field];
    const n = Number.parseInt(value, 10);
    if (Number.isNaN(n)) return limits.min;
    return Math.min(limits.max, Math.max(limits.min, n));
}
