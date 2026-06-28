import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppTitleState = {
    title: string;
    mobileBackTo?: '/chat';
} | null;

type AppTitleContextValue = {
    title: AppTitleState;
    setTitle: (title: AppTitleState) => void;
};

const AppTitleContext = createContext<AppTitleContextValue | null>(null);

export function AppTitleProvider({ children }: { children: ReactNode }) {
    const [ title, setTitle ] = useState<AppTitleState>(null);
    const value = useMemo(() => ({ title, setTitle }), [ title ]);

    return (
        <AppTitleContext.Provider value={value}>
            {children}
        </AppTitleContext.Provider>
    );
}

export function useAppTitle() {
    const context = useContext(AppTitleContext);
    if (!context) {
        throw new Error('useAppTitle must be used inside AppTitleProvider');
    }
    return context.title;
}

export function PageTitle({ title, mobileBackTo }: { title: string; mobileBackTo?: '/chat' }) {
    const context = useContext(AppTitleContext);
    const setTitle = context?.setTitle;

    useEffect(() => {
        if (!setTitle) return;
        setTitle({ title, mobileBackTo });
        return () => setTitle(null);
    }, [ mobileBackTo, setTitle, title ]);

    return null;
}
