import React, { useState } from 'react';
import { Trash2, ArrowRight, Zap, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatButtonLabel } from '../utils/buttonLabels';
import { labelForMapping } from '../utils/keyLabels';
import { turboFor } from '../utils/turbo';
import TurboSettings from './TurboSettings';

export default function MappingRow({ mapping, onToggle, onDelete, onUpdate, isActiveButton, controllerLayout }) {
    const buttonLabel = formatButtonLabel(mapping.button, controllerLayout, mapping.buttonLabel);
    const turbo = turboFor(mapping);
    const [expanded, setExpanded] = useState(false);
    const lit = isActiveButton && mapping.enabled;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`group relative flex flex-col p-4 mb-3 rounded-xl border transition-colors duration-300
            ${lit
                    ? 'bg-primary/10 border-primary/40 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                    : mapping.enabled
                        ? 'bg-zinc-900/60 border-white/5 hover:bg-zinc-800/60 hover:border-white/10'
                        : 'bg-zinc-900/30 border-transparent opacity-50 grayscale-[50%]'
                }`}
        >

            {/* Active Highlight Line */}
            {lit && (
                <div className="absolute left-0 top-6 w-1 h-8 bg-primary rounded-r-md"></div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 flex-1 pl-2">
                    {/* Controller Button Side */}
                    <div className="flex flex-col gap-1 w-32">
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Input</span>
                        <div className="flex items-center gap-2">
                            <span className={`font-mono text-sm font-bold px-3 py-1.5 rounded-md border ${lit
                                ? 'bg-primary/20 text-primary border-primary/30'
                                : 'bg-black/50 text-zinc-300 border-white/5'
                                }`}>
                                {buttonLabel}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center p-2 rounded-full bg-zinc-800/50 border border-white/5 text-zinc-500">
                        <ArrowRight size={14} className={lit ? "text-primary" : ""} />
                    </div>

                    {/* Keyboard Side */}
                    <div className="flex flex-col gap-1 w-32">
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Output</span>
                        <div className="flex items-center gap-2">
                            <kbd className={`font-mono text-sm font-bold px-3 py-1 border-b-2 rounded border-x border-t transition-all ${lit
                                ? 'bg-white text-black border-zinc-300 border-b-zinc-400 translate-y-px'
                                : 'bg-zinc-800 text-zinc-100 border-zinc-700 border-b-zinc-950'
                                }`}>
                                {labelForMapping(mapping)}
                            </kbd>
                            {turbo.enabled && (
                                <span
                                    className="flex items-center gap-1 text-[10px] font-mono font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded"
                                    title={`Turbo: repeats every ${turbo.rate} ms${turbo.toggle ? ', toggle mode' : ''}`}
                                >
                                    <Zap size={10} />
                                    {turbo.rate}
                                </span>
                            )}
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
                        onClick={() => setExpanded(v => !v)}
                        aria-expanded={expanded}
                        className={`flex items-center gap-1 p-2 rounded-lg transition-all
                            ${expanded
                                ? 'text-primary bg-primary/10'
                                : turbo.enabled
                                    ? 'text-primary/80 hover:text-primary hover:bg-primary/10'
                                    : 'text-zinc-600 hover:text-zinc-200 hover:bg-white/5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}`}
                        title="Turbo / hold-to-repeat settings"
                    >
                        <Zap size={18} />
                        <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>

                    <button
                        onClick={() => onDelete(mapping.id)}
                        className="text-zinc-600 hover:text-rose-400 hover:bg-rose-400/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        title="Delete mapping"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        key="turbo"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden px-2"
                    >
                        <TurboSettings mapping={mapping} onUpdate={onUpdate} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
