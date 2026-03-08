import React, { useState } from 'react';
import { Settings, Plus, Play, Square, Gamepad } from 'lucide-react';

export default function ProfileSelector({
    profiles,
    activeProfileId,
    setActiveProfileId,
    onCreateProfile,
    onOpenSettings,
    isActive,
    onToggleActive
}) {
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const handleCreate = (e) => {
        e.preventDefault();
        if (newName.trim()) {
            onCreateProfile(newName.trim());
            setNewName('');
            setIsCreating(false);
        }
    };

    return (
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/40 border-b border-white/5 shadow-inner">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Gamepad size={16} className="text-zinc-500" />
                    <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Profile</span>
                </div>

                {isCreating ? (
                    <form onSubmit={handleCreate} className="flex gap-2">
                        <input
                            autoFocus
                            className="bg-black/50 text-white text-sm rounded-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary w-40 border border-white/10 shadow-inner transition-all"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Name..."
                            onBlur={() => !newName && setIsCreating(false)}
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

                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center justify-center h-7 w-7 rounded-md bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 hover:shadow-sm border border-transparent hover:border-white/10 transition-all"
                        title="New Profile"
                    >
                        <Plus size={16} />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
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
