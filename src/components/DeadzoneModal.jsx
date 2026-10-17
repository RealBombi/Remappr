import React, { useState, useEffect, useRef } from 'react';
import { X, SlidersHorizontal, AlertTriangle, Info, RotateCcw } from 'lucide-react';
import { useStickPreview } from '../hooks/useStickPreview';
import {
    DEFAULT_DEADZONES, DEADZONE_LIMITS, STICK_MAX, TRIGGER_MAX,
    LOW_STICK_DEADZONE, clampDeadzone
} from '../utils/deadzones';

const SAVE_DELAY_MS = 300;

function pct(value, max) {
    return `${Math.round(value / max * 100)}%`;
}

/**
 * Circle like Steam's calibration screen: the shaded disc is the deadzone,
 * the hollow dot is where the stick physically is and the filled dot is what
 * games receive from the virtual pad.
 */
function StickPreview({ deadzone, raw, out }) {
    const size = 112;
    const c = size / 2;
    const r = c - 6;

    // Square-gated sticks overshoot the circle on diagonals; pin the dot to
    // the rim so it stays inside the drawing.
    const toPoint = (x, y) => {
        const mag = Math.hypot(x, y);
        const k = mag > STICK_MAX ? STICK_MAX / mag : 1;
        return [c + x * k / STICK_MAX * r, c - y * k / STICK_MAX * r];
    };

    const dzR = deadzone / STICK_MAX * r;
    const rawPt = raw && toPoint(raw[0], raw[1]);
    const outPt = out && toPoint(out[0], out[1]);
    const inDeadzone = raw && Math.hypot(raw[0], raw[1]) <= deadzone && deadzone > 0;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
            <circle cx={c} cy={c} r={r} className="fill-black/40 stroke-white/15" strokeWidth="1.5" />
            <circle cx={c} cy={c} r={r * 0.5} className="fill-none stroke-white/5" strokeWidth="1" />
            <line x1={c - r} y1={c} x2={c + r} y2={c} className="stroke-white/5" strokeWidth="1" />
            <line x1={c} y1={c - r} x2={c} y2={c + r} className="stroke-white/5" strokeWidth="1" />
            {dzR > 0 && (
                <circle
                    cx={c} cy={c} r={dzR}
                    className={inDeadzone ? 'fill-amber-400/35 stroke-amber-400/80' : 'fill-amber-400/15 stroke-amber-400/40'}
                    strokeWidth="1"
                />
            )}
            {rawPt && (
                <circle cx={rawPt[0]} cy={rawPt[1]} r="5" className="fill-none stroke-zinc-400" strokeWidth="1.5" />
            )}
            {outPt && (
                <circle cx={outPt[0]} cy={outPt[1]} r="4" className="fill-primary" style={{ filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.8))' }} />
            )}
        </svg>
    );
}

function TriggerPreview({ deadzone, raw, out }) {
    const dzW = deadzone / TRIGGER_MAX * 100;
    return (
        <div className="relative h-2.5 w-full rounded-full bg-black/40 border border-white/10 overflow-hidden">
            {dzW > 0 && (
                <div className="absolute inset-y-0 left-0 bg-amber-400/20" style={{ width: `${dzW}%` }} />
            )}
            {out != null && (
                <div className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-75" style={{ width: `${out / TRIGGER_MAX * 100}%` }} />
            )}
            {raw != null && (
                <div className="absolute inset-y-0 w-0.5 bg-zinc-300" style={{ left: `calc(${raw / TRIGGER_MAX * 100}% - 1px)` }} />
            )}
        </div>
    );
}

function DeadzoneSlider({ label, field, value, max, step, onChange }) {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-zinc-300">{label}</span>
                <span className="font-mono text-sm text-zinc-100">
                    {value}
                    <span className="text-zinc-500 text-xs ml-1.5">{pct(value, max)}</span>
                </span>
            </div>
            <input
                type="range"
                min={0}
                max={DEADZONE_LIMITS[field]}
                step={step}
                value={value}
                onChange={(e) => onChange(field, e.target.value)}
                aria-label={label}
                className="w-full accent-[var(--color-primary)] cursor-pointer"
            />
        </div>
    );
}

function StickCard({ title, field, value, onChange, live, xKey, yKey }) {
    const raw = live ? [live.raw[xKey], live.raw[yKey]] : null;
    const out = live ? [live.out[xKey], live.out[yKey]] : null;
    return (
        <div className="flex flex-col gap-3 bg-black/30 border border-white/5 rounded-xl p-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest">{title}</h3>
            <div className="flex items-center gap-4">
                <StickPreview deadzone={value} raw={raw} out={out} />
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                    <DeadzoneSlider label="Deadzone" field={field} value={value} max={STICK_MAX} step={50} onChange={onChange} />
                    {value < LOW_STICK_DEADZONE && (
                        <div className="flex items-start gap-2 text-[11px] leading-snug text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-2">
                            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-px" />
                            <span>Low deadzone: a worn stick is more likely to drift.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Deadzones for the emulated controller, with a live view of both sticks and
 * triggers.  Slider changes reach the backend at once; saving to disk is
 * debounced so dragging a slider doesn't rewrite the config file on every step.
 */
export default function DeadzoneModal({ isOpen, onClose, deadzones, onChange, onSave, emulationMode, isConnected }) {
    const [draft, setDraft] = useState(deadzones);
    const saveTimer = useRef(null);
    const pending = useRef(null);
    const live = useStickPreview(isOpen && isConnected);

    useEffect(() => {
        if (isOpen) setDraft(deadzones);
        // Only resync when (re)opened; while open the draft is the source of truth.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const flush = () => {
        clearTimeout(saveTimer.current);
        if (pending.current) {
            onSave(pending.current);
            pending.current = null;
        }
    };

    // Save anything still pending if the modal goes away mid-drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => flush, []);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    });

    const update = (next) => {
        setDraft(next);
        onChange(next);
        pending.current = next;
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);
    };

    const setField = (field, value) => update({ ...draft, [field]: clampDeadzone(field, value) });

    const handleClose = () => {
        flush();
        onClose();
    };

    if (!isOpen) return null;

    const emulating = emulationMode !== 'off';

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 no-drag backdrop-blur-sm">
            <div className="bg-zinc-950 w-[700px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-52px)] flex flex-col rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-slide-up">
                <div className="flex justify-between items-center px-5 py-3.5 border-b border-white/10 bg-zinc-900/50">
                    <h2 className="font-semibold text-lg flex items-center gap-2 text-zinc-100">
                        <SlidersHorizontal size={18} className="text-zinc-400" />
                        Deadzones
                    </h2>
                    <button onClick={handleClose} className="text-zinc-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 flex flex-col gap-3.5 overflow-y-auto">
                    <div className={`flex items-start gap-2.5 text-xs leading-relaxed rounded-lg px-3.5 py-2.5 border
                        ${emulating
                            ? 'bg-primary/10 border-primary/20 text-zinc-300'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-100'}`}
                    >
                        {emulating
                            ? <Info size={15} className="text-primary flex-shrink-0 mt-px" />
                            : <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-px" />}
                        <span>
                            {emulating
                                ? 'Ignores small movements near the centre to stop drift. Any game reading the emulated controller gets this, Steam or not; games reading the real pad still get the raw stick.'
                                : 'Deadzones only apply to the emulated controller. Set "Appears as" to Xbox 360 or DualShock 4 for games to see them.'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <StickCard title="Left Stick" field="left" value={draft.left} onChange={setField} live={live} xKey="lx" yKey="ly" />
                        <StickCard title="Right Stick" field="right" value={draft.right} onChange={setField} live={live} xKey="rx" yKey="ry" />
                    </div>

                    <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                        <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Triggers</h3>
                        <div className="grid grid-cols-2 gap-6">
                            {[['lt', 'Left Trigger'], ['rt', 'Right Trigger']].map(([field, label]) => (
                                <div key={field} className="flex flex-col gap-2.5">
                                    <DeadzoneSlider label={label} field={field} value={draft[field]} max={TRIGGER_MAX} step={1} onChange={setField} />
                                    <TriggerPreview deadzone={draft[field]} raw={live?.raw[field]} out={live?.out[field]} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-4 py-3 border-t border-white/5 bg-zinc-900/50 flex items-center justify-between gap-3">
                    <button
                        onClick={() => update({ ...DEFAULT_DEADZONES })}
                        className="flex items-center gap-1.5 px-4 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg text-sm font-medium transition-colors"
                    >
                        <RotateCcw size={14} />
                        Reset to defaults
                    </button>
                    <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                        {isConnected ? (
                            <>
                                <span className="flex items-center gap-1.5">
                                    <span className="inline-block w-2.5 h-2.5 rounded-full border-[1.5px] border-zinc-400" />
                                    Real stick
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary" />
                                    What games see
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400/40" />
                                    Deadzone
                                </span>
                            </>
                        ) : (
                            <span>Connect a controller to see live input.</span>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        className="px-6 py-2 bg-primary hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
