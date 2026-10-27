'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme, ACCENT_PRESETS, AccentPreset } from '../../lib/context/theme-context';
import { IconSun, IconMoon, IconPalette, IconCheckCircle, IconX } from './icons';

interface ThemeCustomizerProps {
  compact?: boolean;
  className?: string;
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ compact = false, className = '' }) => {
  const { themeMode, toggleThemeMode, accent, setAccent, customColor, setCustomColor, activeConfig, isMounted } =
    useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const presetList = Object.values(ACCENT_PRESETS);

  // Avoid SSR hydration layout flash
  if (!isMounted) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-8 w-8 rounded-lg bg-slate-800/40 border border-slate-700/50" />
      </div>
    );
  }

  return (
    <div className={`relative flex items-center gap-1.5 sm:gap-2 ${className}`} ref={popoverRef}>
      {/* 1. Dark / Light Mode Toggle Button */}
      <button
        type="button"
        onClick={toggleThemeMode}
        aria-label={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} mode`}
        title={`Current mode: ${themeMode === 'dark' ? 'Dark' : 'Light'}. Click to toggle.`}
        className="group relative flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] hover:border-[var(--primary-accent)] hover:text-[var(--primary-accent)] shadow-2xs transition-all focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]"
      >
        <span className="sr-only">Toggle Dark and Light theme</span>
        <motion.div
          key={themeMode}
          initial={{ rotate: -45, opacity: 0, scale: 0.8 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 45, opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center"
        >
          {themeMode === 'dark' ? (
            <IconMoon size={16} className="text-blue-400 group-hover:text-[var(--primary-accent)] transition-colors" />
          ) : (
            <IconSun size={16} className="text-amber-500 group-hover:text-[var(--primary-accent)] transition-colors" />
          )}
        </motion.div>
      </button>

      {/* 2. Accent Color Palette Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Customize accent color theme"
        title={`Active accent: ${activeConfig.name}. Click to change theme accent.`}
        className="group relative flex h-8.5 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--primary-accent)] shadow-2xs transition-all focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]"
      >
        <div
          className="h-3.5 w-3.5 rounded-full shadow-[0_0_8px_var(--primary-accent-glow)] transition-transform group-hover:scale-110"
          style={{ backgroundColor: activeConfig.primary }}
        />
        {!compact && (
          <span className="hidden md:inline-block text-[11px] font-mono tracking-tight text-[var(--text-secondary)]">
            {activeConfig.name}
          </span>
        )}
        <IconPalette size={14} className="text-[var(--text-secondary)] group-hover:text-[var(--primary-accent)] transition-colors" />
      </button>

      {/* 3. Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] p-4 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)] mb-3">
              <div className="flex items-center gap-2">
                <IconPalette size={16} className="text-[var(--primary-accent)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Accent Color
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-subtle)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Close color picker"
              >
                <IconX size={14} />
              </button>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {presetList.map((preset) => {
                  const isSelected = accent === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setAccent(preset.id as AccentPreset);
                      }}
                      className={`group relative flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-all ${
                        isSelected
                          ? 'border-[var(--primary-accent)] bg-[var(--primary-accent-subtle)] shadow-[0_0_12px_var(--primary-accent-glow)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div
                        className="h-4 w-4 rounded-full transition-transform group-hover:scale-110 shadow-xs"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span className="text-[10px] font-bold text-[var(--text-primary)] leading-tight">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1 right-1 text-[var(--primary-accent)]">
                          <IconCheckCircle size={10} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Selector */}
              <div className="pt-2 border-t border-[var(--border-subtle)] mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                    Custom Hex Code:
                  </span>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="custom-accent-color-input"
                      className="flex items-center gap-1.5 cursor-pointer rounded-md border border-[var(--border-subtle)] px-2 py-1 bg-[var(--bg-surface)] hover:border-[var(--primary-accent)] transition-colors"
                    >
                      <input
                        id="custom-accent-color-input"
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="h-4 w-4 cursor-pointer rounded-full border-0 bg-transparent p-0"
                      />
                      <span className="font-mono text-[10px] text-[var(--text-primary)] uppercase">
                        {customColor}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Mode Switcher in Popover */}
            <div className="mt-3.5 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                Appearance Mode
              </span>
              <div className="flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => toggleThemeMode()}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    themeMode === 'dark'
                      ? 'bg-[var(--primary-accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <IconMoon size={11} />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleThemeMode()}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    themeMode === 'light'
                      ? 'bg-[var(--primary-accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <IconSun size={11} />
                  <span>Light</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
