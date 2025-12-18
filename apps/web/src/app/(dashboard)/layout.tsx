"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [user, setUser] = useState<{ name: string; email: string; role?: string } | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            setUser(JSON.parse(userData));
        } else {
            router.push("/login");
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        router.push("/login");
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Sidebar
                open={sidebarOpen}
                setOpen={setSidebarOpen}
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
                user={user}
                onLogout={handleLogout}
            />

            <div className={cn(
                "flex flex-col min-h-screen transition-all duration-300",
                sidebarCollapsed ? "lg:pl-[80px]" : "lg:pl-[280px]"
            )}>
                {/* 
                    Note: lg:pl-[80px] assumes sidebar is collapsed by default on desktop. 
                    If we want dynamic padding based on sidebar state, we need to lift that state up 
                    or Context. For now, we'll stick to a simpler fixed padding or just let sidebar overlap 
                    content style if we want full width. 
                    
                    Actually, for the collapsible sidebar to push content, we need the state here.
                    Let's update the Sidebar component to lift state up.
                 */}
                <Header onOpenSidebar={() => setSidebarOpen(true)} />
                <main className="flex-1 p-6 lg:p-8 animate-in fade-in duration-500">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
