import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bir: {
          blue: '#0069a2',
          navy: '#004aac',
          yellow: '#ffde2a',
          gold: '#edc81b',
          teal: '#03989d',
          red: '#c81a25',
        },
      },
    },
  },
  plugins: [],
};

export default config;
