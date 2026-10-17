import { useState, useEffect } from 'react';
import { onPythonEvent, sendCommand } from '../utils/ipc';

// Live stick / trigger values from the backend, raw and after deadzones.
// Streaming only runs while a component using this hook is mounted with
// `enabled`, so the backend isn't sending ~30 messages a second for nothing.
export function useStickPreview(enabled) {
    const [state, setState] = useState(null);

    useEffect(() => {
        if (!enabled) return;
        sendCommand({ type: 'stick_preview', enabled: true });
        const unsubscribe = onPythonEvent((event) => {
            if (event.type === 'stick_state') {
                setState({ raw: event.raw, out: event.out });
            } else if (event.type === 'controller_disconnected') {
                setState(null);
            }
        });
        return () => {
            unsubscribe();
            sendCommand({ type: 'stick_preview', enabled: false });
            setState(null);
        };
    }, [enabled]);

    return state;
}
