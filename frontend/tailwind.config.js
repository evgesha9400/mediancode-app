/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        'mono-50': '#fafafa',
        'mono-100': '#f5f5f5',
        'mono-200': '#e5e5e5',
        'mono-300': '#d4d4d4',
        'mono-400': '#a3a3a3',
        'mono-500': '#737373',
        'mono-600': '#525252',
        'mono-700': '#404040',
        'mono-800': '#262626',
        'mono-900': '#171717',
        'red-50': '#fef2f2',
        'red-100': '#fee2e2',
        'red-200': '#fecaca',
        'red-600': '#dc2626',
        'red-700': '#b91c1c',
        'red-800': '#991b1b',
      }
    }
  },
  plugins: []
}
