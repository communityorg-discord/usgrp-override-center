/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './src/renderer/index.html',
        './src/renderer/src/**/*.{js,jsx,ts,tsx}'
    ],
    theme: {
        extend: {
            colors: {
                gold: {
                    DEFAULT: '#D4AF37',
                    light: '#f4d03f',
                    dark: '#b8960c'
                },
                surface: {
                    primary: '#0a0a0f',
                    secondary: '#12121a',
                    tertiary: '#1a1a2e',
                    card: '#16162a'
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace']
            }
        }
    },
    plugins: []
};
