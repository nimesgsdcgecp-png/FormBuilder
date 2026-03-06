'use client';

/**
 * ThemeToggle — Sun/Moon button for switching light ↔ dark mode.
 *
 * Applies the 'dark' class to <html> so Tailwind's dark: variants
 * and our CSS custom properties activate. Persists the selection
 * to localStorage so it survives page refreshes.
 *
 * Uses suppressHydrationWarning on the button and a `mounted` flag
 * to avoid a React hydration mismatch — the server always renders
 * the Moon icon, and the client corrects it immediately after mount
 * without throwing a warning.
 *
 * Used in Dashboard header, Builder header, and public form page.
 */

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    const toggle = () => {
        const next = !isDark;
        setIsDark(next);
        if (next) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <button
            onClick={toggle}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            suppressHydrationWarning
            className="p-2 rounded-lg transition-all duration-200
        text-[var(--text-muted)] hover:text-[var(--text-primary)]
        hover:bg-[var(--bg-muted)] border border-transparent
        hover:border-[var(--border)]"
        >
            {/* Before mount: always render Moon to match SSR output. After mount: render true state. */}
            {!mounted || !isDark ? <Moon size={18} /> : <Sun size={18} />}
        </button>
    );
}
