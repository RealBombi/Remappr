import React, { useState, useEffect } from 'react';
import { useController } from './hooks/useController';
import { useProfiles } from './hooks/useProfiles';
import { useUIFocus } from './hooks/useUIFocus';

import StatusBar from './components/StatusBar';
import ProfileSelector from './components/ProfileSelector';
import MappingList from './components/MappingList';
import AddMappingModal from './components/AddMappingModal';
import SettingsModal from './components/SettingsModal';
import DisclaimerModal from './components/DisclaimerModal';
import { Minus, X, AlertTriangle } from 'lucide-react';
import appLogo from '../assets/remappr_logo_1_1772933761473.png';
import { minimizeWindow, closeWindow, getAppVersion } from './utils/ipc';

function App() {
  const {
    controllerName,
    isConnected,
    lastButton,
    detectButton,
    isActive,
    toggleActive,
    activeButton,
    lastError,
    clearError
  } = useController();

  useEffect(() => {
    if (!lastError) return;
    const timer = setTimeout(clearError, 6000);
    return () => clearTimeout(timer);
  }, [lastError, clearError]);

  // Initialize global controller UI navigation
  useUIFocus({ activeButton });

  const {
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
  } = useProfiles();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(
    () => localStorage.getItem('disclaimerAccepted') === 'true'
  );

  useEffect(() => {
    getAppVersion().then(setAppVersion);
  }, []);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('disclaimerAccepted', 'true');
    setDisclaimerAccepted(true);
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-zinc-400 bg-zinc-950">
        <img src={appLogo} alt="Remappr" className="w-12 h-12 animate-pulse mb-6 opacity-80" />
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <span className="font-medium tracking-wide">Initializing Remappr...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen text-white bg-transparent">
      {/* Premium Titlebar */}
      <div className="titlebar flex justify-between">
        <div className="flex items-center gap-2 opacity-80">
          <img src={appLogo} alt="Remappr" className="w-4 h-4" />
          <span className="tracking-wide">Remappr</span>
        </div>

        <div className="flex items-center gap-1 no-drag h-full">
          <button
            onClick={minimizeWindow}
            className="h-full px-3 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors flex items-center justify-center"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={closeWindow}
            className="h-full px-3 hover:bg-rose-500 hover:text-white text-zinc-400 transition-colors flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <StatusBar
        isConnected={isConnected}
        controllerName={controllerName}
        activeButton={activeButton}
      />

      <ProfileSelector
        profiles={config.profiles}
        activeProfileId={activeProfileId}
        setActiveProfileId={setActiveProfileId}
        onCreateProfile={createProfile}
        onRenameProfile={renameProfile}
        onDeleteProfile={deleteProfile}
        onImportProfile={importProfileData}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isActive={isActive}
        onToggleActive={toggleActive}
      />

      <MappingList
        mappings={activeProfile?.mappings || []}
        onToggle={toggleMapping}
        onDelete={removeMapping}
        onAdd={() => setIsAddModalOpen(true)}
        activeButton={activeButton}
      />

      <div className="bg-black/80 backdrop-blur-md border-t border-white/5 p-2 text-center text-[11px] font-medium text-zinc-600 no-drag uppercase tracking-widest z-10">
        Run as Administrator if games block inputs
      </div>

      <AddMappingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={addMapping}
        onDetect={detectButton}
        lastDetectedButton={lastButton}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={config.settings}
        onUpdateSettings={updateSettings}
        appVersion={appVersion}
      />

      {lastError && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 no-drag animate-slide-up">
          <div className="flex items-center gap-3 bg-rose-950/95 border border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.25)] rounded-lg px-4 py-2.5 backdrop-blur-sm max-w-[520px]">
            <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />
            <span className="text-sm text-rose-100 leading-snug flex-1 break-words">{lastError.message}</span>
            <button
              onClick={clearError}
              className="text-rose-300 hover:text-white hover:bg-white/10 p-1 rounded transition-colors flex-shrink-0"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {!disclaimerAccepted && (
        <DisclaimerModal onAccept={handleAcceptDisclaimer} />
      )}
    </div>
  );
}

export default App;
