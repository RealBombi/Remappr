import { useState, useEffect } from 'react';
import { onPythonEvent, sendCommand } from '../utils/ipc';

export function useController() {
    const [controllerName, setControllerName] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastButton, setLastButton] = useState(null);
    const [isActive, setIsActive] = useState(true);
    const [activeButton, setActiveButton] = useState(null);
    const [lastError, setLastError] = useState(null);

    useEffect(() => {
        sendCommand({ type: 'check_controller' });

        const unsubscribe = onPythonEvent((event) => {
            switch (event.type) {
                case 'controller_connected':
                    setControllerName(event.name);
                    setIsConnected(true);
                    break;
                case 'controller_disconnected':
                    setControllerName(null);
                    setIsConnected(false);
                    break;
                case 'button_detected':
                    setLastButton(event.button);
                    break;
                case 'button_pressed':
                    setActiveButton(event.button);
                    break;
                case 'button_released':
                    setActiveButton(prev => prev === event.button ? null : prev);
                    break;
                case 'error':
                    if (event.message === "No controller found") {
                        setIsConnected(false);
                    } else {
                        setLastError({ message: event.message, at: Date.now() });
                    }
                    break;
                default:
                    break;
            }
        });

        return () => unsubscribe();
    }, []);

    const detectButton = () => {
        setLastButton(null);
        sendCommand({ type: 'detect' });
    };

    const toggleActive = () => {
        if (isActive) {
            sendCommand({ type: 'stop' });
            setIsActive(false);
        } else {
            // Don't send mappings here — useProfiles will resync them
            // via update_mappings once isActive triggers a re-render
            sendCommand({ type: 'start' });
            setIsActive(true);
        }
    };

    const clearError = () => setLastError(null);

    return {
        controllerName,
        isConnected,
        lastButton,
        detectButton,
        isActive,
        toggleActive,
        activeButton,
        lastError,
        clearError
    };
}
