import React, { useState } from 'react';
import { Settings, Plus, Play, Square, Gamepad, Pencil, Trash2, Upload, Download } from 'lucide-react';
import { exportProfile, importProfile } from '../utils/ipc';

export default function ProfileSelector({
    profiles,
    activeProfileId,
    setActiveProfileId,
    onCreateProfile,
    onRenameProfile,
    onDeleteProfile,
    onImportProfile,
    onOpenSettings,
    isActive,
    onToggleActive
}) {
    const [mode, setMode] = useState('idle'); // 'idle' | 'creating' | 'renaming'
    const [nameDraft, setNameDraft] = useState('');

    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const canDelete = profiles.length > 1;

    const startCreating = () => {
        setNameDraft('');
        setMode('creating');
    };

    const startRenaming = () => {
        setNameDraft(activeProfile?.name || '');
        setMode('renaming');
    };

    const submitName = (e) => {
        e.preventDefault();
        const name = nameDraft.trim();
        if (!name) {
            setMode('idle');
            return;
        }
        if (mode === 'creating') {
            onCreateProfile(name);
        } else if (mode === 'renaming' && activeProfile) {
            onRenameProfile(activeProfile.id, name);
        }
        setMode('idle');
        setNameDraft('');
    };

    const handleDelete = () => {
        if (!activeProfile || !canDelete) return;
        if (window.confirm(`Delete profile "${activeProfile.name}"? This cannot be undone.`)) {
            onDeleteProfile(activeProfile.id);
        }
    };

    const handleExport = async () => {
        if (!activeProfile) return;
        await exportProfile({ name: activeProfile.name, mappings: activeProfile.mappings });
    };

    const handleImport = async () => {
        const result = await importProfile();
        if (!result) return;
        if (result.error) {
            window.alert(`Import failed: ${result.error}`);
            return;
        }
        onImportProfile(result);
    };

    const iconBtn = 'flex items-center justify-center h-7 w-7 rounded-md bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 hover:shadow-sm border border-transparent hover:border-white/10 transition-all';
    const iconBtnDanger = 'flex items-center justify-center h-7 w-7 rounded-md bg-white/5 text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all';
    const iconBtnDisabled = 'flex items-center justify-center h-7 w-7 rounded-md bg-white/5 text-zinc-700 cursor-not-allowed border border-transparent';

    return (
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/40 border-b border-white/5 shadow-inner">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Gamepad size={16} className="text-zinc-500" />
                    <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Profile</span>
                </div>

                {mode !== 'idle' ? (
                    <form onSubmit={submitName} className="flex gap-2">
                        <input
                            autoFocus
                            className="bg-black/50 text-white text-sm rounded-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary w-40 border border-white/10 shadow-inner transition-all"
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            placeholder={mode === 'creating' ? 'New profile name...' : 'Rename profile...'}
                            onBlur={() => { if (!nameDraft) setMode('idle'); }}
                            onKeyDown={(e) => { if (e.key === 'Escape') setMode('idle'); }}
                        />
                    </form>
                ) : (
                    <div className="relative group">
                        <select
                            className="appearance-none bg-black/40 hover:bg-black/60 text-zinc-100 text-sm font-medium rounded-lg px-4 py-1.5 pr-8 outline-none border border-white/10 cursor-pointer shadow-sm transition-all focus:border-primary/50"
                            value={activeProfileId}
                            onChange={(e) => setActiveProfileId(e.target.value)}
                        >
                            {profiles.map(p => (
                                <option key={p.id} value={p.id} className="bg-zinc-900">{p.name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                )}

                {mode === 'idle' && (
                    <div className="flex items-center gap-1.5">
                        <button onClick={startCreating} className={iconBtn} title="New profile">
                            <Plus size={14} />
                        </button>
                        <button onClick={startRenaming} className={iconBtn} title="Rename profile" disabled={!activeProfile}>
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={handleDelete}
                            className={canDelete ? iconBtnDanger : iconBtnDisabled}
                            title={canDelete ? 'Delete profile' : 'Cannot delete the last profile'}
                            disabled={!canDelete}
                        >
                            <Trash2 size={14} />
                        </button>
                        <div className="w-px h-5 bg-white/10 mx-1" />
                        <button onClick={handleImport} className={iconBtn} title="Import profile from file">
                            <Download size={14} />
                        </button>
                        <button onClick={handleExport} className={iconBtn} title="Export profile to file" disabled={!activeProfile}>
                            <Upload size={14} />
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleActive}
                    className={`flex items-center justify-center h-8 w-8 rounded-lg hover:shadow-sm transition-all ${
                        isActive
                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-zinc-500 hover:bg-white/10 hover:text-white'
                    }`}
                    title={isActive ? 'Pause remapping' : 'Resume remapping'}
                >
                    {isActive ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                </button>
                <button
                    onClick={onOpenSettings}
                    className="flex items-center justify-center h-8 w-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 hover:shadow-sm transition-all"
                    title="Settings"
                >
                    <Settings size={18} />
                </button>
            </div>
        </div>
    );
}
