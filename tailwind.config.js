/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                sys: {
                    bg: '#000000',
                    card: '#1C1C1E',
                    elevated: '#2C2C2E',
                    fill: '#3A3A3C',
                    separator: '#38383A',
                    label: '#FFFFFF',
                    'label-secondary': '#8E8E93',
                    'label-tertiary': '#48484A',
                    'label-quaternary': '#3A3A3C',
                    blue: '#0A84FF',
                    green: '#30D158',
                    red: '#FF453A',
                    orange: '#FF9F0A',
                    yellow: '#FFD60A',
                    purple: '#BF5AF2',
                    pink: '#FF375F',
                    teal: '#64D2FF',
                    indigo: '#5E5CE6',
                    cyan: '#00C7BE',
                },
            },
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.4s ease-out both',
                'fade-in-fast': 'fadeIn 0.2s ease-out both',
                'slide-up': 'slideUp 0.5s cubic-bezier(0.25, 1, 0.5, 1) both',
                'slide-up-fast': 'slideUp 0.25s cubic-bezier(0.25, 1, 0.5, 1) both',
                'slide-in-right': 'slideInRight 0.45s cubic-bezier(0.25, 1, 0.5, 1) both',
                'scale-in': 'scaleIn 0.3s cubic-bezier(0.25, 1, 0.5, 1) both',
                'shimmer': 'shimmer 2s linear infinite',
                'draw-line': 'drawLine 1.5s ease-out both',
                'toast-in': 'toastIn 0.35s cubic-bezier(0.25, 1, 0.5, 1) both',
                'toast-out': 'toastOut 0.25s ease-in both',
                'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                drawLine: {
                    '0%': { strokeDashoffset: '1000' },
                    '100%': { strokeDashoffset: '0' },
                },
                toastIn: {
                    '0%': { transform: 'translateY(-8px) scale(0.96)', opacity: '0' },
                    '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
                },
                toastOut: {
                    '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
                    '100%': { transform: 'translateY(-8px) scale(0.96)', opacity: '0' },
                },
                bounceIn: {
                    '0%': { transform: 'scale(0)', opacity: '0' },
                    '70%': { transform: 'scale(1.05)' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
