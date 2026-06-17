"use client";

import { useTheme, type Theme } from "@/components/theme/ThemeProvider";

const OPTIONS: { value: Theme; label: string; hint: string; swatch: string }[] = [
  { value: "light", label: "Light", hint: "Bright and clean", swatch: "linear-gradient(135deg,#ffffff,#e9e9ef)" },
  { value: "dark", label: "Dark", hint: "The classic Scrolls look", swatch: "linear-gradient(135deg,#1d1d20,#020203)" },
  { value: "cheetah", label: "Cheetah", hint: "Warm amber with spots", swatch: "linear-gradient(135deg,#f0a830,#2e2010)" }
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={active}
            className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
              active ? "border-scrolls-gold bg-white/[0.06]" : "border-white/12 hover:bg-white/[0.05]"
            }`}
          >
            <span
              className="h-10 w-10 shrink-0 rounded-xl border border-white/15"
              style={{ background: option.swatch }}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-bold text-white">
                {option.label}
                {active ? <span className="text-xs text-scrolls-gold">✓</span> : null}
              </span>
              <span className="block truncate text-xs text-white/50">{option.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
