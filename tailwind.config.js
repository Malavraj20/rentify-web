/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rentify: {
          navy: '#767e91',
          lightNavy: '#9aa0b5',
          deepNavy: '#1b1738',
          deepNavy2: '#2a2354',
          deepIndigo: '#3a2f78',
          purpleLight: '#e8e4ff',
          purpleLight2: '#f3f1ff',
          purpleLight3: '#f9f8ff',
          white: '#ffffff',
          whiteOff: '#faf9fb',
          grayMuted: '#6d7491',
          grayLight: '#f0f2f5',
          grayLighter: '#f8f9fa',
          successGreen: '#22c55e',
          cautionOrange: '#f6e05e',
          infoBlue: '#3b82f6',
          borderDefault: '#d1d5db',
        },
        brand: {
          navy: '#767e91',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}