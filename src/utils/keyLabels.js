// Mappings store the *physical* key (KeyboardEvent.code, e.g. "Semicolon")
// because games read key positions, not characters.  On a Norwegian keyboard
// the physical "Semicolon" key is printed Ø, so the label shown to the user
// comes from the character the key produced when it was recorded (e.key).

const CODE_LABELS = {
    Space: 'SPACE',
    Enter: 'ENTER',
    NumpadEnter: 'NUM ENTER',
    Tab: 'TAB',
    Escape: 'ESC',
    Backspace: 'BACKSPACE',
    Delete: 'DEL',
    Insert: 'INS',
    Home: 'HOME',
    End: 'END',
    PageUp: 'PG UP',
    PageDown: 'PG DN',
    CapsLock: 'CAPS',
    NumLock: 'NUM LOCK',
    ScrollLock: 'SCR LOCK',
    PrintScreen: 'PRT SC',
    ContextMenu: 'MENU',
    ShiftLeft: 'SHIFT',
    ShiftRight: 'R SHIFT',
    ControlLeft: 'CTRL',
    ControlRight: 'R CTRL',
    AltLeft: 'ALT',
    AltRight: 'ALT GR',
    MetaLeft: 'WIN',
    MetaRight: 'R WIN',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    NumpadAdd: 'NUM +',
    NumpadSubtract: 'NUM -',
    NumpadMultiply: 'NUM *',
    NumpadDivide: 'NUM /',
    NumpadDecimal: 'NUM .',
};

/**
 * Label for a key as it was pressed while recording a mapping.
 *
 * Printable keys use the character the user's layout produced ("Ø", ";", "A"),
 * so the row reads the same as the keycap.  Everything else is named by its
 * physical code.
 */
export function labelForKeyEvent(e) {
    const key = e.key || '';
    const code = e.code || '';

    if (CODE_LABELS[code]) return CODE_LABELS[code];
    if (/^Numpad\d$/.test(code)) return `NUM ${code.slice(-1)}`;
    if (key.length === 1 && key !== ' ') return key.toUpperCase();
    if (/^F\d{1,2}$/.test(code)) return code;
    if (/^Key([A-Z])$/.test(code)) return code.slice(3);
    if (/^Digit(\d)$/.test(code)) return code.slice(5);
    return (code || key).toUpperCase();
}

/**
 * Label for a saved mapping, including profiles from before physical-key
 * mapping existed, which stored names such as "a", "space" or "ctrl".
 */
export function labelForMapping(mapping) {
    if (mapping.keyLabel) return mapping.keyLabel;
    const key = mapping.key || '';
    if (CODE_LABELS[key]) return CODE_LABELS[key];
    if (/^Key([A-Z])$/.test(key)) return key.slice(3);
    if (/^Digit(\d)$/.test(key)) return key.slice(5);
    return key.toUpperCase();
}
