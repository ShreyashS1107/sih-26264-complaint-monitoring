'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light';

export type AccentPreset = 'blue' | 'cyan' | 'violet' | 'emerald' | 'rose' | 'amber' | 'custom';

export interface AccentColorConfig {
  id: AccentPreset;
  name: string;
  primary: string;
  hover: string;
  subtle: string;
  border: string;
  glow: string;
}

export const ACCENT_PRESETS: Record<Exclude<AccentPreset, 'custom'>, AccentColorConfig> = {
  blue: {
    id: 'blue',
    name: 'Electric Blue',
    primary: '#315EFB',
    hover: '#224EDB',
    subtle: 'rgba(49, 94, 251, 0.15)',
    border: 'rgba(49, 94, 251, 0.35)',
    glow: 'rgba(49, 94, 251, 0.45)',
  },
  cyan: {
    id: 'cyan',
    name: 'Cyan',
    primary: '#06B6D4',
    hover: '#0891B2',
    subtle: 'rgba(6, 182, 212, 0.15)',
    border: 'rgba(6, 182, 212, 0.35)',
    glow: 'rgba(6, 182, 212, 0.45)',
  },
  violet: {
    id: 'violet',
    name: 'Violet',
    primary: '#8B5CF6',
    hover: '#7C3AED',
    subtle: 'rgba(139, 92, 246, 0.15)',
    border: 'rgba(139, 92, 246, 0.35)',
    glow: 'rgba(139, 92, 246, 0.45)',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    primary: '#10B981',
    hover: '#059669',
    subtle: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.35)',
    glow: 'rgba(16, 185, 129, 0.45)',
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    primary: '#F43F5E',
    hover: '#E11D48',
    subtle: 'rgba(244, 63, 94, 0.15)',
    border: 'rgba(244, 63, 94, 0.35)',
    glow: 'rgba(244, 63, 94, 0.45)',
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    primary: '#F59E0B',
    hover: '#D97706',
    subtle: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.35)',
    glow: 'rgba(245, 158, 11, 0.45)',
  },
};

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  let r = 49;
  let g = 94;
  let b = 251;
  if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16) || 49;
    g = parseInt(cleanHex.substring(2, 4), 16) || 94;
    b = parseInt(cleanHex.substring(4, 6), 16) || 251;
  } else if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) || 49;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) || 94;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) || 251;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function adjustHexBrightness(hex: string, percent: number): string {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + Math.round((255 * percent) / 100);
  let g = ((num >> 8) & 0x00ff) + Math.round((255 * percent) / 100);
  let b = (num & 0x0000ff) + Math.round((255 * percent) / 100);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

interface ThemeContextType {
  themeMode: ThemeMode;
  accent: AccentPreset;
  customColor: string;
  activeConfig: AccentColorConfig;
  toggleThemeMode: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentPreset) => void;
  setCustomColor: (hex: string) => void;
  isMounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY_MODE = 'sih26264_theme_mode';
const STORAGE_KEY_ACCENT = 'sih26264_theme_accent';
const STORAGE_KEY_CUSTOM = 'sih26264_theme_custom_color';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_MODE) as ThemeMode;
        if (saved === 'dark' || saved === 'light') return saved;
      } catch {}
    }
    return 'dark';
  });

  const [accent, setAccentState] = useState<AccentPreset>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_ACCENT) as AccentPreset;
        if (saved && (saved in ACCENT_PRESETS || saved === 'custom')) return saved;
      } catch {}
    }
    return 'blue';
  });

  const [customColor, setCustomColorState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CUSTOM);
        if (saved) return saved;
      } catch {}
    }
    return '#315EFB';
  });

  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Apply properties to the DOM
  const applyThemeToDOM = useCallback(
    (mode: ThemeMode, currentAccent: AccentPreset, currentCustom: string) => {
      if (typeof document === 'undefined') return;
      const root = document.documentElement;

      // 1. Theme mode attribute & class
      root.setAttribute('data-theme', mode);
      if (mode === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }

      // 2. Accent attribute
      root.setAttribute('data-accent', currentAccent);

      // 3. If custom color, write CSS variables directly
      if (currentAccent === 'custom') {
        const hover = adjustHexBrightness(currentCustom, -12);
        const subtle = hexToRgba(currentCustom, 0.15);
        const border = hexToRgba(currentCustom, 0.35);
        const glow = hexToRgba(currentCustom, 0.45);

        root.style.setProperty('--primary-accent', currentCustom);
        root.style.setProperty('--primary-accent-hover', hover);
        root.style.setProperty('--primary-accent-subtle', subtle);
        root.style.setProperty('--primary-accent-border', border);
        root.style.setProperty('--primary-accent-glow', glow);
      } else {
        const preset = ACCENT_PRESETS[currentAccent] || ACCENT_PRESETS.blue;
        root.style.setProperty('--primary-accent', preset.primary);
        root.style.setProperty('--primary-accent-hover', preset.hover);
        root.style.setProperty('--primary-accent-subtle', preset.subtle);
        root.style.setProperty('--primary-accent-border', preset.border);
        root.style.setProperty('--primary-accent-glow', preset.glow);
      }
    },
    []
  );

  // Initial client load synchronization
  useEffect(() => {
    applyThemeToDOM(themeMode, accent, customColor);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, [themeMode, accent, customColor, applyThemeToDOM]);

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      setThemeModeState(mode);
      try {
        localStorage.setItem(STORAGE_KEY_MODE, mode);
      } catch {}
      applyThemeToDOM(mode, accent, customColor);
    },
    [accent, customColor, applyThemeToDOM]
  );

  const toggleThemeMode = useCallback(() => {
    const nextMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
  }, [themeMode, setThemeMode]);

  const setAccent = useCallback(
    (nextAccent: AccentPreset) => {
      setAccentState(nextAccent);
      try {
        localStorage.setItem(STORAGE_KEY_ACCENT, nextAccent);
      } catch {}
      applyThemeToDOM(themeMode, nextAccent, customColor);
    },
    [themeMode, customColor, applyThemeToDOM]
  );

  const setCustomColor = useCallback(
    (hex: string) => {
      setCustomColorState(hex);
      setAccentState('custom');
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM, hex);
        localStorage.setItem(STORAGE_KEY_ACCENT, 'custom');
      } catch {}
      applyThemeToDOM(themeMode, 'custom', hex);
    },
    [themeMode, applyThemeToDOM]
  );

  const activeConfig = useMemo<AccentColorConfig>(() => {
    if (accent === 'custom') {
      return {
        id: 'custom',
        name: 'Custom',
        primary: customColor,
        hover: adjustHexBrightness(customColor, -12),
        subtle: hexToRgba(customColor, 0.15),
        border: hexToRgba(customColor, 0.35),
        glow: hexToRgba(customColor, 0.45),
      };
    }
    return ACCENT_PRESETS[accent] || ACCENT_PRESETS.blue;
  }, [accent, customColor]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        accent,
        customColor,
        activeConfig,
        toggleThemeMode,
        setThemeMode,
        setAccent,
        setCustomColor,
        isMounted,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
