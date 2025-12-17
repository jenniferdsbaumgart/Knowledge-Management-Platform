import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ActiveOrganisationContextType {
    activeOrgId: string | null;
    setActiveOrgId: (id: string | null) => void;
    isLoading: boolean;
}

const ActiveOrganisationContext = createContext<ActiveOrganisationContextType | undefined>(undefined);

export function ActiveOrganisationProvider({ children }: { children: ReactNode }) {
    const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load from localStorage on mount
        const stored = localStorage.getItem('activeOrganisationId');
        if (stored) {
            setActiveOrgIdState(stored);
        }
        setIsLoading(false);
    }, []);

    const setActiveOrgId = (id: string | null) => {
        if (id) {
            localStorage.setItem('activeOrganisationId', id);
        } else {
            localStorage.removeItem('activeOrganisationId');
        }
        setActiveOrgIdState(id);

        // Force reload to ensure all queries are refetched with new header
        // Alternatively, we could invalidate all queries with React Query, 
        // but a reload ensures clean state for all components.
        // However, invalidating queries is smoother. Let's try without reload first.
        // Actually, since api.ts reads from localStorage, we just need to update localStorage first (done above).
    };

    return (
        <ActiveOrganisationContext.Provider value={{ activeOrgId, setActiveOrgId, isLoading }}>
            {children}
        </ActiveOrganisationContext.Provider>
    );
}

export function useActiveOrganisation() {
    const context = useContext(ActiveOrganisationContext);
    if (context === undefined) {
        throw new Error('useActiveOrganisation must be used within a ActiveOrganisationProvider');
    }
    return context;
}
