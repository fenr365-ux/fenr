/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fenr: {
          bg: '#1A1D21',
          sidebar: '#22262C',
          realms: '#141618',
          input: '#2A2F37',
          text: '#F2F5F7',
          muted: '#7A8290',
          brand: '#4A7AFF',
          hover: '#262B33',
          active: '#2E3440',
          teal: '#4DD1C4',
          orange: '#FF7A3D',
          red: '#FF4D4D',
          glass: 'rgba(34,38,44,0.75)',
          border: 'rgba(74,122,255,0.15)'
        }
      },
      fontFamily: {
        display: ['Orbitron', 'Rajdhani', 'sans-serif'],
        body: ['Rajdhani', 'Inter', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 12px rgba(74,122,255,0.25)',
        'glow-teal': '0 0 12px rgba(77,209,196,0.2)',
        'glow-orange': '0 0 12px rgba(255,122,61,0.2)'
      },
      backdropBlur: {
        xs: '4px'
      }
    }
  },
  plugins: []
};
