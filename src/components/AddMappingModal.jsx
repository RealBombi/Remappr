import React, { useState, useEffect } from 'react';
import { X, Gamepad2, Keyboard, CheckCircle2 } from 'lucide-react';

export default function AddMappingModal({ isOpen, onClose, onSave, onDetect, lastDetectedButton }) {
    const [step, setStep] = useState(1);
    const [button, setButton] = useState(null);
    const [key, setKey] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setButton(null);
            setKey(null);
            onDetect();
        }
    }, [isOpen]);

    useEffect(() => {
        if (step === 1 && lastDetectedButton) {
            setButton(lastDetectedButton);
            setStep(2);
        }
    }, [lastDetectedButton, step]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (step === 2) {
                e.preventDefault();
                setKey(e.key.toLowerCase());
                setStep(3);
            }
        };

        if (step === 2) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [step]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({
            id: `map-${Date.now()}`,
            button,
            buttonLabel: button.replace('BTN_', ''),
            key,
            keyLabel: key.toUpperCase(),
            enabled: true
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 no-drag backdrop-blur-md">
            <div className="bg-zinc-950 w-[420px] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden flex flex-col animate-slide-up">

                {/* Decorative Gradient Top Line */}
                <div className="h-1 w-full bg-gradient-to-r from-primary to-blue-500"></div>

                <div className="flex justify-between items-center p-5 border-b border-white/5">
                    <h2 className="font-semibold text-zinc-100 tracking-wide">New Map Configuration</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-1.5 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-10 flex flex-col items-center justify-center min-h-[220px] text-center gap-6 relative overflow-hidden">

                    {/* Background glow based on step */}
                    <div className={`absolute inset-0 opacity-20 transition-all duration-700 blur-[80px] pointer-events-none rounded-full scale-150
                        ${step === 1 ? 'bg-primary' : step === 2 ? 'bg-blue-500' : 'bg-green-500'}`}
                    />

                    {step === 1 && (
                        <div className="animate-slide-up flex flex-col items-center gap-4 z-10 w-full">
                            <div className="p-4 rounded-2xl bg-primary/20 border border-primary/30 text-primary shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                                <Gamepad2 size={40} className="animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Controller Input</h3>
                                <p className="text-sm text-zinc-400">Press the button you want to map...</p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-slide-up flex flex-col items-center gap-4 z-10 w-full">
                            <div className="p-4 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                                <Keyboard size={40} className="animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Keyboard Output</h3>
                                <p className="text-sm text-zinc-400">Press the key to assign to <span className="text-primary font-mono font-bold bg-primary/20 px-2 py-0.5 rounded ml-1">{button.replace('BTN_', '')}</span></p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-slide-up flex flex-col items-center gap-5 z-10 w-full">
                            <div className="p-4 rounded-2xl bg-green-500/20 border border-green-500/30 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                <CheckCircle2 size={40} />
                            </div>
                            <div className="w-full bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-center gap-5 font-mono text-xl shadow-inner">
                                <span className="text-primary font-bold">{button.replace('BTN_', '')}</span>
                                <span className="text-zinc-500 text-sm">→</span>
                                <span className="text-blue-400 uppercase font-bold text-2xl">{key}</span>
                            </div>
                            <p className="text-sm font-medium text-emerald-400/80 tracking-wide">Configuration Ready</p>
                        </div>
                    )}

                </div>

                <div className="p-5 border-t border-white/5 bg-zinc-950/50 flex justify-end gap-3 backdrop-blur-md">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={step !== 3}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${step === 3
                                ? 'bg-primary hover:bg-primary-hover text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]'
                                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-white/5'
                            }`}
                    >
                        Save Mapping
                    </button>
                </div>
            </div>
        </div>
    );
}
