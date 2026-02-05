// Design tokens derived from Kerkoporta visual system
// Dark slate palette: sophisticated, analytical, geometric

export const theme = {
  colors: {
    // Core palette
    background: '#1A1A1A',
    surface: '#242424',
    surfaceRaised: '#2E2E2E',
    border: '#3A3A3A',
    borderSubtle: '#333333',

    // Text
    textPrimary: '#E0E0E0',
    textSecondary: '#A0A0A0',
    textMuted: '#707070',

    // Accent (Kerkoporta cream)
    accent: '#DDCBAD',
    accentMuted: '#9B8E7B',

    // Status
    success: '#7BAD8E',
    warning: '#DDCBAD',
    error: '#AD7B7B',
    info: '#7B8EAD',
  },

  fonts: {
    mono: "'JetBrains Mono', 'Fira Code', monospace",
    sans: "'Inter', -apple-system, system-ui, sans-serif",
  },
} as const
