import React from 'react';
import { Zap } from 'lucide-react';
import { turboFor, clampTurboValue, TURBO_LIMITS } from '../utils/turbo';

function Toggle({ label, hint, checked, onChange, disabled }) {
    return (
        <label
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onChange(!checked);
                }
            }}
            className={`flex items-center justify-between gap-4 p-2.5 -mx-2.5 rounded-lg transition-colors group
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'}`}
        >
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{label}</span>
                {hint && <span className="text-[11px] text-zinc-500 leading-snug">{hint}</span>}
            </div>
            <div className="relative inline-flex items-center flex-shrink-0">
                <input
                    type="checkbox"
                    tabIndex={-1}
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only peer toggle-checkbox"
                />
                <div className="w-9 h-5 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary transition-colors"></div>
            </div>
        </label>
    );
}

function MsField({ label, hint, field, value, onCommit, disabled }) {
    const [draft, setDraft] = React.useState(String(value));
    const [seenValue, setSeenValue] = React.useState(value);

    // Keep the box in sync if the stored value changes from elsewhere.
    if (value !== seenValue) {
        setSeenValue(value);
        setDraft(String(value));
    }

    const commit = () => {
        const clamped = clampTurboValue(field, draft);
        setDraft(String(clamped));
        if (clamped !== value) onCommit(clamped);
    };

    return (
        <div className={`flex items-center justify-between gap-4 p-2.5 -mx-2.5 rounded-lg ${disabled ? 'opacity-40' : ''}`}>
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-zinc-300">{label}</span>
                {hint && <span className="text-[11px] text-zinc-500 leading-snug">{hint}</span>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <input
                    type="number"
                    inputMode="numeric"
                    min={TURBO_LIMITS[field].min}
                    max={TURBO_LIMITS[field].max}
                    step={field === 'rate' ? 5 : 10}
                    disabled={disabled}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                    className="w-20 bg-black/50 text-white font-mono text-sm text-right rounded-md px-2.5 py-1.5 outline-none border border-white/10 shadow-inner focus:ring-1 focus:ring-primary transition-all disabled:cursor-not-allowed"
                />
                <span className="text-xs font-mono text-zinc-500 w-6">ms</span>
            </div>
        </div>
    );
}

/**
 * Per-mapping hold-to-repeat settings, shown below a mapping row.
 */
export default function TurboSettings({ mapping, onUpdate }) {
    const turbo = turboFor(mapping);
    const set = (patch) => onUpdate(mapping.id, { turbo: { ...turbo, ...patch } });
    const off = !turbo.enabled;

    return (
        <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
            <div className="md:col-span-2 flex items-center gap-2 mb-1">
                <Zap size={13} className={turbo.enabled ? 'text-primary' : 'text-zinc-500'} />
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Hold to Repeat</h4>
                {turbo.enabled && (
                    <span className="ml-auto text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                        every {turbo.rate} ms
                    </span>
                )}
            </div>

            <div className="flex flex-col">
                <Toggle
                    label="Turbo"
                    hint="Repeat the key while the button is held."
                    checked={turbo.enabled}
                    onChange={(v) => set({ enabled: v })}
                />
                <Toggle
                    label="Toggle mode"
                    hint="Press once to start repeating, press again to stop."
                    checked={turbo.toggle}
                    disabled={off}
                    onChange={(v) => set({ toggle: v })}
                />
                <Toggle
                    label="Interruptable"
                    hint={turbo.toggle
                        ? 'Not used in toggle mode.'
                        : 'Stop the instant the button is released, even mid-press.'}
                    checked={turbo.interruptable}
                    disabled={off || turbo.toggle}
                    onChange={(v) => set({ interruptable: v })}
                />
            </div>

            <div className="flex flex-col">
                <MsField
                    label="Repeat rate"
                    hint="Time between presses."
                    field="rate"
                    value={turbo.rate}
                    disabled={off}
                    onCommit={(v) => set({ rate: v })}
                />
                <MsField
                    label="Fire start delay"
                    hint="Hold this long before repeating begins."
                    field="startDelay"
                    value={turbo.startDelay}
                    disabled={off}
                    onCommit={(v) => set({ startDelay: v })}
                />
                <MsField
                    label="Fire end delay"
                    hint="Keep repeating this long after release."
                    field="endDelay"
                    value={turbo.endDelay}
                    disabled={off}
                    onCommit={(v) => set({ endDelay: v })}
                />
            </div>
        </div>
    );
}
