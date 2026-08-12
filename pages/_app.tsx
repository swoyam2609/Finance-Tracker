import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { Inter } from 'next/font/google'
import FinanceProvider from '@/components/data/FinanceProvider'
import { ToastHost } from '@/components/layout/ToastHost'

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
})

// Providers live here rather than in AppShell: pages call useFinance() and
// useToast() in the same component that renders AppShell, so the providers
// have to sit above the page itself.
export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
    return (
        <SessionProvider session={session}>
            <div className={inter.variable}>
                <FinanceProvider>
                    <ToastHost>
                        <Component {...pageProps} />
                    </ToastHost>
                </FinanceProvider>
            </div>
        </SessionProvider>
    )
}
