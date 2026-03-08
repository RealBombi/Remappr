import { useEffect, useRef } from 'react';

// Maps game controller events to basic navigation intent
// The string matching handles varying controller reports (Xbox/Playstation)
export function useUIFocus({ activeButton }) {
    const activeObj = activeButton ? String(activeButton).toUpperCase() : '';
    const lastActiveRef = useRef(null);

    useEffect(() => {
        // Prevent double fires
        if (activeObj === lastActiveRef.current) return;
        lastActiveRef.current = activeObj;

        if (!activeObj) return;

        // Navigation
        if (activeObj.includes('DPAD_DOWN')) return navigateFocus('next');
        if (activeObj.includes('DPAD_UP')) return navigateFocus('prev');
        if (activeObj.includes('DPAD_RIGHT')) return navigateFocus('next');
        if (activeObj.includes('DPAD_LEFT')) return navigateFocus('prev');

        // Actions (A button)
        if (activeObj === 'BTN_A') {
            const activeEl = document.activeElement;
            if (activeEl && typeof activeEl.click === 'function') {
                activeEl.click();
            }
            return;
        }

        // Cancel / Back (B button)
        if (activeObj === 'BTN_B') {
            // Unfocus current element
            if (document.activeElement) document.activeElement.blur();
            // Dispatch escape key for modals
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            return;
        }

    }, [activeObj]);

    function navigateFocus(direction) {
        // Query all focusable UI elements we care about
        const nodes = Array.from(document.querySelectorAll(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ));

        if (nodes.length === 0) return;

        const activeEl = document.activeElement;
        let index = nodes.indexOf(activeEl);

        if (direction === 'next') {
            index = index + 1 >= nodes.length ? 0 : index + 1;
        } else {
            index = index - 1 < 0 ? nodes.length - 1 : index - 1;
        }

        nodes[index].focus();
    }
}
