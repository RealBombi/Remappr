import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DisclaimerModal({ onAccept }) {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 no-drag backdrop-blur-sm">
            <div className="bg-zinc-950 w-[420px] rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-slide-up">
                <div className="p-5 border-b border-white/10 bg-zinc-900/50">
                    <h2 className="font-semibold text-lg flex items-center gap-2.5 text-zinc-100">
                        <AlertTriangle size={20} className="text-amber-400" />
                        Disclaimer
                    </h2>
                </div>

                <div className="p-6 flex flex-col gap-4">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        Remappr works by converting controller inputs into keyboard key presses. Some games and anti-cheat systems may consider this a form of automation or input spoofing.
                    </p>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                        <p className="text-sm text-amber-200/90 leading-relaxed font-medium">
                            Use at your own risk. The developers of Remappr are not responsible for any account bans, suspensions, or other penalties that may result from using this software.
                        </p>
                    </div>

                    <p className="text-xs text-zinc-500 leading-relaxed">
                        By clicking "I Understand" you acknowledge that you have read and accept this disclaimer. You will not be shown this message again.
                    </p>
                </div>

                <div className="p-4 border-t border-white/5 bg-zinc-900/50 flex justify-end">
                    <button
                        onClick={onAccept}
                        className="px-6 py-2.5 bg-primary hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                    >
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    );
}
