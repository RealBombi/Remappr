import { useState, useEffect } from 'react';
import { onPythonEvent, sendCommand } from '../utils/ipc';

export function useController() {
    const [controllerName, setControllerName] = useState(null);
    // Keeps its last value while disconnected so labels don't flip to Xbox
    // names the moment a DualSense is unplugged.
    const [controllerLayout, setControllerLayout] = useState('xbox');
    const [isConnected, setIsConnected] = useState(false);
    const [lastButton, setLastButton] = useState(null);
    const [isActive, setIsActive] = useState(true);
    const [activeButton, setActiveButton] = useState(null);
    const [lastError, setLastError] = useState(null);
    // Controller emulation (virtual Xbox 360 / DualShock 4 via ViGEmBus)
    const [emulation, setEmulation] = useState({
        mode: 'off', active: false, driverInstalled: null, installer: null, error: null
    });

    useEffect(() => {
        sendCommand({ type: 'check_controller' });
        sendCommand({ type: 'check_emulation' });

        const unsubscribe = onPythonEvent((event) => {
            switch (event.type) {
                case 'controller_connected':
                    setControllerName(event.name);
                    setControllerLayout(event.layout || 'xbox');
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
                case 'emulation_status':
                    setEmulation({
                        mode: event.mode || 'off',
                        active: !!event.active,
                        driverInstalled: !!event.driver_installed,
                        installer: event.installer || null,
                        error: event.error || null
                    });
                    if (event.error) {
                        setLastError({ message: event.error, at: Date.now() });
                    }
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

    const setEmulationMode = (mode) => {
        setEmulation(prev => ({ ...prev, mode, error: null }));
        sendCommand({ type: 'set_emulation', mode });
    };

    const refreshEmulation = () => sendCommand({ type: 'check_emulation' });

    return {
        emulation,
        setEmulationMode,
        refreshEmulation,
        controllerName,
        controllerLayout,
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
