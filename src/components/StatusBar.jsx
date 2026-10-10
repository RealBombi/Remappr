import React, { useState } from 'react';
import { Gamepad2, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { installDriver } from '../utils/ipc';

// How the pad is presented to Windows / Steam / games.  'off' passes the real
// controller straight through; the others mirror it onto a virtual pad.
const EMULATION_OPTIONS = [
    { value: 'off', label: 'Native' },
    { value: 'xbox360', label: 'Xbox 360' },
    { value: 'ds4', label: 'DualShock 4' },
];

function emulationBadge(emulation, emulationMode) {
    if (emulationMode === 'off') return null;
    const target = EMULATION_OPTIONS.find(o => o.value === emulationMode)?.label || emulationMode;
    if (emulation.active) {
        return { text: `Games see: ${target}`, tone: 'text-emerald-400' };
    }
    if (emulation.driverInstalled === false) {
        return { text: 'Driver needed', tone: 'text-amber-400' };
    }
    if (emulation.error) {
        return { text: 'Emulation failed', tone: 'text-rose-400' };
    }
    return { text: `Waiting for pad to emulate ${target}`, tone: 'text-zinc-400' };
}

export default function StatusBar({
    isConnected, controllerName, activeButton,
    emulation, emulationMode, onEmulationChange, onRefreshEmulation
}) {
    const [installing, setInstalling] = useState(false);
    const [installError, setInstallError] = useState(null);

    const needsDriver = emulationMode !== 'off' && emulation.driverInstalled === false;
    const badge = emulationBadge(emulation, emulationMode);

    const handleInstall = async () => {
        setInstalling(true);
        setInstallError(null);
        const result = await installDriver(emulation.installer);
        setInstalling(false);
        if (!result?.ok) {
            setInstallError(result?.error || 'Could not start the installer');
        }
    };

    return (
        <div className="glass-panel border-x-0 border-t-0 border-b border-white/5 z-10 relative">
            <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isConnected ? 'bg-primary/20 text-primary' : 'bg-zinc-800 text-zinc-500'} transition-colors duration-500`}>
                        <Gamepad2 size={20} />
                    </div>
                    <div>
                        <div className="text-xs text-zinc-400 font-medium tracking-wider uppercase mb-0.5">Device Target</div>
                        <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                            {controllerName || 'Waiting for connection...'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    {/* Appears-as selector */}
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase">Appears as</span>
                        <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 gap-0.5">
                            {EMULATION_OPTIONS.map(opt => {
                                const selected = emulationMode === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => onEmulationChange(opt.value)}
                                        aria-pressed={selected}
                                        title={opt.value === 'off'
                                            ? 'Pass the real controller through unchanged'
                                            : `Show the controller to games as a ${opt.label} pad`}
                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all
                                            ${selected
                                                ? 'bg-primary text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="w-px h-8 bg-white/5"></div>

                    <div className="flex flex-col items-end gap-1 min-w-[110px]">
                        <div className="flex items-center gap-2">
                            <div className="relative flex h-3 w-3">
                                {isConnected && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
                                )}
                                <span className={`relative inline-flex rounded-full h-3 w-3 transition-colors duration-300 ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></span>
                            </div>
                            <span className={`text-sm font-medium transition-colors duration-300 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        {badge && (
                            <span className={`text-[11px] font-medium ${badge.tone}`}>{badge.text}</span>
                        )}
                    </div>
                </div>
            </div>

            {needsDriver && (
                <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-500/10 border-t border-amber-500/20 text-amber-100">
                    <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />
                    <span className="text-xs leading-snug flex-1">
                        Controller emulation needs the free <span className="font-semibold">ViGEmBus</span> driver, the same one DS4Windows uses.
                        Install it once, then click refresh. Windows will ask for admin approval.
                        {installError && <span className="block text-rose-300 mt-0.5">{installError}</span>}
                    </span>
                    <button
                        onClick={handleInstall}
                        disabled={installing || !emulation.installer}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-xs font-bold transition-colors"
                    >
                        <Download size={13} />
                        {installing ? 'Opening…' : 'Install driver'}
                    </button>
                    <button
                        onClick={onRefreshEmulation}
                        title="Check again"
                        className="p-1.5 rounded-md text-amber-200 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
