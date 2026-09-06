// The backend emits one canonical set of BTN_* names for every pad, so a
// profile built on an Xbox controller still works on a DualSense.  Only the
// label differs: BTN_A reads "A" on an Xbox pad and "CROSS" on a DualSense.

const PLAYSTATION_LABELS = {
    BTN_A: 'CROSS',
    BTN_B: 'CIRCLE',
    BTN_X: 'SQUARE',
    BTN_Y: 'TRIANGLE',
    BTN_LB: 'L1',
    BTN_RB: 'R1',
    BTN_LT: 'L2',
    BTN_RT: 'R2',
    BTN_L_THUMB: 'L3',
    BTN_R_THUMB: 'R3',
    BTN_BACK: 'CREATE',
    BTN_START: 'OPTIONS',
    BTN_GUIDE: 'PS',
};

/**
 * Label for a controller button under the connected pad's layout.
 *
 * Labels are resolved at render time rather than stored on the mapping, so a
 * profile shows PlayStation names on a DualSense and Xbox names on an Xbox
 * pad without the saved profile changing.
 */
export function formatButtonLabel(button, layout, fallback) {
    if (!button) return fallback || '';
    if (layout === 'playstation' && PLAYSTATION_LABELS[button]) {
        return PLAYSTATION_LABELS[button];
    }
    return fallback || String(button).replace('BTN_', '');
}
