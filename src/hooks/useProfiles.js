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
        updateSettings,
        isLoaded
    };
}
