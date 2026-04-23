import { useState, useEffect } from 'react';
import { loadConfig, saveConfig, sendCommand } from '../utils/ipc';

const DEFAULT_CONFIG = {
    settings: {
        startWithWindows: false,
        startMinimized: false,
        minimizeToTray: true,
        defaultProfile: 'default'
    },
    profiles: [
        {
            id: 'default',
            name: 'Default',
            mappings: []
        }
    ]
};

export function useProfiles() {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [activeProfileId, setActiveProfileId] = useState('default');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        async function init() {
            const savedConfig = await loadConfig();
            if (savedConfig) {
                setConfig(savedConfig);
                setActiveProfileId(savedConfig.settings?.defaultProfile || savedConfig.profiles?.[0]?.id || 'default');
            }
            setIsLoaded(true);
        }
        init();
    }, []);

    useEffect(() => {
        if (isLoaded) {
            saveConfig(config);
        }
    }, [config, isLoaded]);

    const activeProfile = config.profiles.find(p => p.id === activeProfileId) || config.profiles[0];

    const mappingsJson = JSON.stringify(activeProfile?.mappings || []);

    useEffect(() => {
        if (activeProfile && isLoaded) {
            const enabledMappings = activeProfile.mappings.filter(m => m.enabled);
            console.log('[useProfiles] Sending update_mappings:', enabledMappings);
            sendCommand({
                type: 'update_mappings',
                mappings: enabledMappings
            });
        }
    }, [mappingsJson, isLoaded]);

    // Re-sync mappings whenever the controller reconnects (e.g. after a
    // USB micro-disconnect that is common with fight sticks / non-Xbox pads)
    useEffect(() => {
        if (!isLoaded) return;

        let ipcRenderer = null;
        if (window.require) {
            try {
                ipcRenderer = window.require('electron').ipcRenderer;
            } catch (_) { /* not in electron */ }
        }
        if (!ipcRenderer) return;

        const handleReconnect = (_event, data) => {
            if (data?.type === 'controller_reconnected' && activeProfile) {
                const enabledMappings = activeProfile.mappings.filter(m => m.enabled);
                console.log('[useProfiles] Controller reconnected — resyncing', enabledMappings.length, 'mapping(s)');
                sendCommand({
                    type: 'update_mappings',
                    mappings: enabledMappings
                });
            }
        };

        ipcRenderer.on('python-event', handleReconnect);
        return () => ipcRenderer.removeListener('python-event', handleReconnect);
    }, [mappingsJson, isLoaded]);

    const addMapping = (mapping) => {
        setConfig(prev => {
            const profiles = prev.profiles.map(p => {
                if (p.id === activeProfileId) {
                    return { ...p, mappings: [...p.mappings, mapping] };
                }
                return p;
            });
            return { ...prev, profiles };
        });
    };

    const removeMapping = (mappingId) => {
        setConfig(prev => {
            const profiles = prev.profiles.map(p => {
                if (p.id === activeProfileId) {
                    return { ...p, mappings: p.mappings.filter(m => m.id !== mappingId) };
                }
                return p;
            });
            return { ...prev, profiles };
        });
    };

    const toggleMapping = (mappingId) => {
        setConfig(prev => {
            const profiles = prev.profiles.map(p => {
                if (p.id === activeProfileId) {
                    return {
                        ...p,
                        mappings: p.mappings.map(m => m.id === mappingId ? { ...m, enabled: !m.enabled } : m)
                    };
                }
                return p;
            });
            return { ...prev, profiles };
        });
    };

    const createProfile = (name) => {
        const newId = `profile-${Date.now()}`;
        setConfig(prev => ({
            ...prev,
            profiles: [...prev.profiles, { id: newId, name, mappings: [] }]
        }));
        setActiveProfileId(newId);
    };

    const renameProfile = (profileId, newName) => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        setConfig(prev => ({
            ...prev,
            profiles: prev.profiles.map(p => p.id === profileId ? { ...p, name: trimmed } : p)
        }));
    };

    const deleteProfile = (profileId) => {
        setConfig(prev => {
            if (prev.profiles.length <= 1) return prev;
            const remaining = prev.profiles.filter(p => p.id !== profileId);
            if (profileId === activeProfileId) {
                setActiveProfileId(remaining[0].id);
            }
            return { ...prev, profiles: remaining };
        });
    };

    const importProfileData = (data) => {
        const newId = `profile-${Date.now()}`;
        setConfig(prev => {
            const existingNames = new Set(prev.profiles.map(p => p.name));
            let name = data.name || 'Imported Profile';
            if (existingNames.has(name)) {
                let i = 2;
                while (existingNames.has(`${name} (${i})`)) i++;
                name = `${name} (${i})`;
            }
            const mappings = (data.mappings || []).map((m, idx) => ({
                ...m,
                id: m.id || `mapping-${Date.now()}-${idx}`
            }));
            return {
                ...prev,
                profiles: [...prev.profiles, { id: newId, name, mappings }]
            };
        });
        setActiveProfileId(newId);
    };

    const updateSettings = (newSettings) => {
        setConfig(prev => ({ ...prev, settings: { ...prev.settings, ...newSettings } }));
    };

    return {
        config,
        activeProfileId,
        setActiveProfileId,
        activeProfile,
        addMapping,
        removeMapping,
        toggleMapping,
        createProfile,
        renameProfile,
        deleteProfile,
        importProfileData,
        updateSettings,
        isLoaded
    };
}
