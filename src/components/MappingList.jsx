import MappingRow from './MappingRow';
import { Plus, Gamepad2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function MappingList({ mappings, onToggle, onDelete, onAdd, activeButton }) {
    return (
        <div className="flex-1 overflow-y-auto p-5 pb-20 flex flex-col">
            {mappings.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-zinc-500 gap-5 max-w-sm mx-auto text-center mt-[-40px]">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150"></div>
                        <div className="relative p-5 rounded-3xl bg-zinc-900 border border-white/10 shadow-lg text-zinc-400">
                            <Gamepad2 size={40} className="opacity-80" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <h3 className="text-zinc-200 font-semibold text-lg">No maps configured</h3>
                        <p className="text-sm text-zinc-400 mb-2">Create a map to start translating your controller inputs to keyboard strokes.</p>
                    </div>
                    <button
                        onClick={onAdd}
                        className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-black rounded-lg font-bold shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add First Mapping
                    </button>
                </div>
            ) : (
                <>
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-zinc-400 tracking-wider uppercase">Active Configurations</h3>
                        <div className="text-xs bg-zinc-900 border border-white/5 px-2 py-1 rounded text-zinc-500 font-mono">
                            {mappings.length} {mappings.length === 1 ? 'Rule' : 'Rules'}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <AnimatePresence initial={false}>
                            {mappings.map(map => (
                                <MappingRow
                                    key={map.id}
                                    mapping={map}
                                    onToggle={onToggle}
                                    onDelete={onDelete}
                                    isActiveButton={activeButton === map.button}
                                />
                            ))}
                        </AnimatePresence>
                    </div>

                    <motion.button
                        layout
                        onClick={onAdd}
                        className="mt-4 flex items-center justify-center gap-2 py-4 border border-dashed border-white/10 rounded-xl text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all outline-none focus:ring-2 focus:ring-primary/50 group"
                    >
                        <div className="bg-zinc-800 p-1.5 rounded-md group-hover:bg-zinc-700 transition-colors">
                            <Plus size={16} />
                        </div>
                        <span className="font-medium">Add New Mapping</span>
                    </motion.button>
                </>
            )}
        </div>
    );
}
