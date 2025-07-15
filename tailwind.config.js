/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#007bff',
        'primary-dark': '#0056b3',
        secondary: '#6c757d',
        background: '#f5f5f5',
        'background-light': '#ffffff',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      fontSize: {
        large: '24px',
        medium: '18px',
        small: '14px',
      },
      borderRadius: {
        DEFAULT: '5px',
      },
      boxShadow: {
        default: '0 0 10px rgba(0, 0, 0, 0.1)',
      },
      transitionTimingFunction: {
        fast: 'ease',
      },
      transitionDuration: {
        fast: '200ms',
      },
    },
  },
  plugins: [],
}

