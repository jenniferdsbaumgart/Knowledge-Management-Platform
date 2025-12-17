"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";

import { ActiveOrganisationProvider } from "../context/ActiveOrganisationContext";

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <ActiveOrganisationProvider>
                    {children}
                </ActiveOrganisationProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
