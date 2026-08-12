import { ReactNode, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import LoadingScreen from '@/components/LoadingScreen';
import BottomNav from './BottomNav';
import SideRail from './SideRail';
// ToastHost is mounted in pages/_app.tsx, not here: a page that calls
// useToast() renders AppShell, so a provider inside AppShell would sit below
// its own consumer.

// ── AppShell ──
// The single chrome every authenticated route renders inside. Owns the document
// head (previously duplicated inline in index.tsx and login.tsx), the auth
// guard moved out of index.tsx, the toast host, and the nav for both breakpoints.
// It deliberately fetches nothing — data belongs to the route.

export default function AppShell({
    children,
    title,
}: {
    children: ReactNode;
    title?: string;
}) {
    const router = useRouter();
    const { status } = useSession();

    // Redirect to login if not authenticated (moved from pages/index.tsx)
    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    return (
        <>
            <Head>
                <title>{title ? `${title} · Finance Tracker` : 'Finance Tracker'}</title>
                <link rel="icon" type="image/png" href="/favicon.png?v=2" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="Finance" />
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#000000" />
            </Head>

            {status === 'loading' && <LoadingScreen />}

            {status === 'authenticated' && (
                <div className="min-h-screen bg-sys-bg">
                    {/* Desktop left rail — md and above */}
                    <SideRail />

                    <main
                        className="min-h-screen md:pl-[62px] lg:pl-[200px] pb-[calc(56px+var(--safe-area-bottom,0px)+0.5rem)] md:pb-10"
                    >
                        {children}
                    </main>

                    {/* Mobile tab bar — below md */}
                    <BottomNav />
                </div>
            )}
        </>
    );
}
