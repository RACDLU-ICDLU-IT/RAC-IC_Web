import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  /** Pass the sidebar's existing light/dark flag so the toggle matches its surroundings */
  isLight?: boolean;
}

const OPTIONS: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
  { mode: 'light', icon: Sun, label: 'Light mode' },
  { mode: 'system', icon: Monitor, label: 'System mode' },
  { mode: 'dark', icon: Moon, label: 'Dark mode' },
];

export default function ThemeToggle({ isLight = true }: ThemeToggleProps) {
  const { mode, setMode } = useTheme();

  const trackBg = isLight ? 'bg-gray-100' : 'bg-white/5';
  const trackBorder = isLight ? 'border-gray-200' : 'border-white/10';
  const activePillBg = isLight ? 'bg-white shadow-sm' : 'bg-white/15';
  const activeIconColor = isLight ? 'text-[var(--color-accent)]' : 'text-white';
  const inactiveIconColor = isLight ? 'text-gray-400 hover:text-gray-600' : 'text-white/40 hover:text-white/70';

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`flex items-center gap-0.5 p-1 rounded-lg border ${trackBg} ${trackBorder} w-full`}
    >
      {OPTIONS.map(({ mode: optionMode, icon: Icon, label }) => {
        const isActive = mode === optionMode;
        return (
          <button
            key={optionMode}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            onClick={() => setMode(optionMode)}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all duration-150 ${
              isActive ? activePillBg : 'bg-transparent'
            }`}
          >
            <Icon
              size={15}
              strokeWidth={2.25}
              className={`shrink-0 transition-colors ${isActive ? activeIconColor : inactiveIconColor}`}
            />
          </button>
        );
      })}
    </div>
  );
}
