import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// ── ToastHost ──
// Extracted verbatim from pages/index.tsx so any route can raise a toast.
// Timings are preserved exactly: visible 3000ms, marked exiting, removed 300ms later.

export type ToastType = 'success' | 'error';

type Toast = {
    id: number;
    message: string;
    type: ToastType;
    exiting?: boolean;
};

type ToastContextValue = {
    addToast: (message: string, type: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be called inside <ToastHost> (mounted by AppShell)');
    }
    return ctx;
}

export function ToastHost({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastCounter = useRef(0);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = ++toastCounter.current;
        setToasts(prev => [...prev, { id, message, type }]);
        timers.current.push(
            setTimeout(() => {
                setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)));
                timers.current.push(
                    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300)
                );
            }, 3000)
        );
    }, []);

    // Clear pending timers if the shell unmounts mid-flight
    useEffect(() => () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}

            <div className="fixed top-4 left-4 right-4 sm:left-auto z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        role="status"
                        aria-live="polite"
                        className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl backdrop-blur-xl shadow-lg ${
                            toast.exiting ? 'animate-toast-out' : 'animate-toast-in'
                        } ${
                            toast.type === 'success'
                                ? 'bg-sys-green/15 text-sys-green'
                                : 'bg-sys-red/15 text-sys-red'
                        }`}
                    >
                        {toast.type === 'success'
                            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            : <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        }
                        <span className="text-sm font-medium">{toast.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export default ToastHost;
