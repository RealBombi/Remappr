import React from 'react';
import { Gamepad2 } from 'lucide-react';

export default function StatusBar({ isConnected, controllerName, activeButton }) {
    return (
        <div className="flex items-center justify-between px-5 py-3 glass-panel border-x-0 border-t-0 border-b border-white/5 z-10 relative">
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
        </div >
    );
}
