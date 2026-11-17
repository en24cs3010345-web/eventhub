const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { bg: v('bg'), surface: v('surface'), ink: v('ink'), muted: v('muted'), line: v('line'),
        brand: '#FFB224', accent: '#E0306E', teal: '#0FA3A3' },
      fontFamily: { display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'], sans: ['"DM Sans"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
