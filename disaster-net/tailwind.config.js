/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neon Cyberpunk palette
        cp: {
          void:        '#050505',   // pure dark void
          base:        '#0d0221',   // deep dark purple/black
          panel:       '#16102b',   // elevated panel
          border:      '#2a2045',   // subtle border
          text:        '#e0e6ed',   // terminal text
          cyan:        '#00f0ff',   // neon cyan
          cyanLine:    '#00d2ff',
          magenta:     '#ff003c',   // hot magenta / glitch red
          pink:        '#ff2a6d',   // neon pink
          yellow:      '#fcee0a',   // toxic yellow
          green:       '#00ff9f',   // matrix green
          dim:         '#4b5563',   // muted
        },
      },
      fontFamily: {
        cyber: ['Orbitron', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'crt-lines': 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
        'cyber-grid': 'linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)',
        'cyber-dots': 'radial-gradient(rgba(0, 240, 255, 0.2) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-sm': '20px 20px',
        'dots-sm': '16px 16px',
      },
      boxShadow: {
        'neon-cyan':    '0 0 10px rgba(0, 240, 255, 0.5), 0 0 20px rgba(0, 240, 255, 0.3)',
        'neon-magenta': '0 0 10px rgba(255, 0, 60, 0.5), 0 0 20px rgba(255, 0, 60, 0.3)',
        'neon-yellow':  '0 0 10px rgba(252, 238, 10, 0.5), 0 0 20px rgba(252, 238, 10, 0.3)',
        'neon-green':   '0 0 10px rgba(0, 255, 159, 0.5), 0 0 20px rgba(0, 255, 159, 0.3)',
        'hard-cyan':    '4px 4px 0px rgba(0, 240, 255, 0.8)',
        'hard-magenta': '4px 4px 0px rgba(255, 0, 60, 0.8)',
        'hard-yellow':  '4px 4px 0px rgba(252, 238, 10, 0.8)',
      },
      animation: {
        'glitch':        'glitch 0.2s cubic-bezier(.25, .46, .45, .94) both infinite',
        'crt-flicker':   'crt-flicker 0.15s infinite',
        'neon-pulse':    'neon-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline':      'scanline 8s linear infinite',
        'marquee':       'marquee 20s linear infinite',
      },
      keyframes: {
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        'crt-flicker': {
          '0%': { opacity: '0.95' },
          '50%': { opacity: '0.90' },
          '100%': { opacity: '0.95' },
        },
        'neon-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' }
        },
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' }
        }
      },
    },
  },
  plugins: [],
}
