// Color palette inspired by the app icon: dark navy background, vibrant green primary, gold accent.

export const LightColors = {
  cream: '#f2faf6',                          // Light mint background
  darkSlate: '#0d1b2a',                      // Dark navy text
  sage: '#4a7c64',                           // Forest green (secondary text, borders)
  rust: '#1a9e5c',                           // Vibrant green – primary action
  gold: '#e8a000',                           // Amber/gold accent
  white: '#ffffff',                          // Card surfaces
  lightBorder: 'rgba(74, 124, 100, 0.2)',
  shadow: 'rgba(13, 27, 42, 0.12)',
  shadowLight: 'rgba(13, 27, 42, 0.06)',
  rustTransparent: 'rgba(26, 158, 92, 0.1)',
  rustShadow: 'rgba(26, 158, 92, 0.25)',
  sageGradientEnd: '#3d6b52',
  resultText: 'rgba(255, 255, 255, 0.9)',
  resultBorder: 'rgba(255, 255, 255, 0.2)',
};

export const DarkColors = {
  cream: '#0d1b2a',                          // Dark navy background (matches icon)
  darkSlate: '#ddeee7',                      // Off-white text
  sage: '#6fa88c',                           // Muted green secondary
  rust: '#2ecc71',                           // Bright green primary in dark mode
  gold: '#f5a623',                           // Brighter gold in dark mode
  white: '#152030',                          // Dark card surfaces
  lightBorder: 'rgba(111, 168, 140, 0.2)',
  shadow: 'rgba(0, 0, 0, 0.4)',
  shadowLight: 'rgba(0, 0, 0, 0.2)',
  rustTransparent: 'rgba(46, 204, 113, 0.15)',
  rustShadow: 'rgba(46, 204, 113, 0.3)',
  sageGradientEnd: '#5a9478',
  resultText: 'rgba(255, 255, 255, 0.9)',
  resultBorder: 'rgba(255, 255, 255, 0.15)',
};

/** Static light-theme colors — use only where a hook cannot be called (e.g. scan screen, onboarding). */
export const Colors = LightColors;

export const Typography = {
  serif: 'Georgia',
  mono: 'Courier New',
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
};

/** Distinct colors for trip participants, assigned round-robin. */
export const PARTICIPANT_COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#f39c12', // orange
  '#9b59b6', // purple
  '#1abc9c', // teal
  '#e91e63', // pink
  '#ff5722', // deep orange
  '#00bcd4', // cyan
  '#8bc34a', // light green
  '#e67e22', // dark orange
];
