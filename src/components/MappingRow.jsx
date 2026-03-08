import React from 'react';
import { Trash2, ArrowRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MappingRow({ mapping, onToggle, onDelete, isActiveButton }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`group relative flex items-center justify-between p-4 mb-3 rounded-xl border transition-colors duration-300
            ${isActiveButton && mapping.enabled
                    ? 'bg-primary/10 border-primary/40 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                    : mapping.enabled
                        ? 'bg-zinc-900/60 border-white/5 hover:bg-zinc-800/60 hover:border-white/10'
                        : 'bg-zinc-900/30 border-transparent opacity-50 grayscale-[50%]'
                }`}
        >

            {/* Active Highlight Line */}
            {isActiveButton && mapping.enabled && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-md"></div>
            )}

            <div className="flex items-center gap-6 flex-1 pl-2">
                {/* Controller Button Side */}
                <div className="flex flex-col gap-1 w-32">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Input</span>
                    <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-bold px-3 py-1.5 rounded-md border ${isActiveButton && mapping.enabled
                            ? 'bg-primary/20 text-primary border-primary/30'
                            : 'bg-black/50 text-zinc-300 border-white/5'
                            }`}>
                            {mapping.buttonLabel || mapping.button}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-center p-2 rounded-full bg-zinc-800/50 border border-white/5 text-zinc-500">
                    <ArrowRight size={14} className={isActiveButton && mapping.enabled ? "text-primary" : ""} />
                </div>

                {/* Keyboard Side */}
                <div className="flex flex-col gap-1 w-32">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Output</span>
                    <div className="flex items-center gap-2">
                        <kbd className={`font-mono text-sm font-bold px-3 py-1 border-b-2 rounded border-x border-t transition-all ${isActiveButton && mapping.enabled
                            ? 'bg-white text-black border-zinc-300 border-b-zinc-400 translate-y-px'
                            : 'bg-zinc-800 text-zinc-100 border-zinc-700 border-b-zinc-950'
                            }`}>
                            {mapping.keyLabel || mapping.key.toUpperCase()}
                        </kbd>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-5 pr-2">
                <label className="relative inline-flex items-center cursor-pointer group-hover:opacity-100">
                    <input
                        type="checkbox"
                        className="sr-only peer toggle-checkbox"
                        checked={mapping.enabled}
                        onChange={() => onToggle(mapping.id)}
                    />
                    <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary transition-colors"></div>
                </label>

                <div className="w-px h-6 bg-white/5"></div>

                <button
                    onClick={() => onDelete(mapping.id)}
                    className="text-zinc-600 hover:text-rose-400 hover:bg-rose-400/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Delete mapping"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </motion.div>
    );
}
