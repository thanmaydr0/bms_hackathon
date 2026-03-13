/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Mirror CSS variables so Tailwind classes like `bg-dn-bg` work
        // alongside arbitrary values like `bg-[var(--color-bg)]`
        dn: {
          bg:          'var(--color-bg)',
          surface:     'var(--color-surface)',
          'surface-2': 'var(--color-surface-2)',
          border:      'var(--color-border)',
          text:        'var(--color-text)',
          muted:       'var(--color-text-muted)',
          accent:      'var(--color-accent)',
          'accent-2':  'var(--color-accent-2)',
          safe:        'var(--color-safe)',
          info:        'var(--color-info)',
        },
      },
      height: {
        dvh: '100dvh', // dynamic viewport height — handles mobile chrome
      },
    },
  },
  plugins: [],
}
