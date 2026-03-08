import React from 'react';
import { X, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, onUpdateSettings, appVersion }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 no-drag backdrop-blur-sm">
            <div className="bg-zinc-950 w-[380px] rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-slide-up">
                <div className="flex justify-between items-center p-5 border-b border-white/10 bg-zinc-900/50">
                    <h2 className="font-semibold text-lg flex items-center gap-2 text-zinc-100">
                        <SettingsIcon size={18} className="text-zinc-400" />
                        App Settings
                    </h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-primary uppercase tracking-widest">General Behavior</h3>

                        <label
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onUpdateSettings({ startMinimized: !settings.startMinimized });
                                }
                            }}
                            className="flex items-center justify-between cursor-pointer group p-3 -mx-3 rounded-lg hover:bg-white/5 transition-colors focus-visible-ring"
                        >
                            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">Start minimized</span>
                            <div className="relative inline-flex items-center">
                                <input
                                    type="checkbox"
                                    tabIndex={-1}
                                    checked={settings.startMinimized}
                                    onChange={(e) => onUpdateSettings({ startMinimized: e.target.checked })}
                                    className="sr-only peer toggle-checkbox"
                                />
                                <div className="w-9 h-5 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary transition-colors"></div>
                            </div>
                        </label>

                        <label
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onUpdateSettings({ minimizeToTray: !settings.minimizeToTray });
                                }
                            }}
                            className="flex items-center justify-between cursor-pointer group p-3 -mx-3 rounded-lg hover:bg-white/5 transition-colors focus-visible-ring"
                        >
                            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">Minimize to tray on close</span>
                            <div className="relative inline-flex items-center">
                                <input
                                    type="checkbox"
                                    tabIndex={-1}
                                    checked={settings.minimizeToTray}
                                    onChange={(e) => onUpdateSettings({ minimizeToTray: e.target.checked })}
                                    className="sr-only peer toggle-checkbox"
                                />
                                <div className="w-9 h-5 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary transition-colors"></div>
                            </div>
                        </label>
                    </div>

                    <div className="border-t border-white/5 pt-5 mt-2">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">About</h3>
                        <div className="bg-black/50 border border-white/5 rounded-lg p-4">
                            <p className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                                <span>Remappr</span>
                                <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full border border-primary/30">v{appVersion || '1.0.0'}</span>
                            </p>
                            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">Advanced input routing and controller bindings for power users and competitive gaming.</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 bg-zinc-900/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-primary hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
