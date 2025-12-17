"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Database,
    FileText,
    BarChart3,
    RefreshCw,
    Settings,
    ChevronLeft,
    Search,
    LogOut,
    HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useMediaQuery } from "@/hooks/use-media-query";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Chat", href: "/chat", icon: Search },
    { name: "Sources", href: "/sources", icon: Database },
    { name: "FAQ", href: "/faq", icon: HelpCircle },
    { name: "Content", href: "/content", icon: FileText },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Sync", href: "/sync", icon: RefreshCw },
    { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    user: { name: string; email: string } | null;
    onLogout: () => void;
}

export function Sidebar({ open, setOpen, collapsed, setCollapsed, user, onLogout }: SidebarProps) {
    const pathname = usePathname();

    const isDesktop = useMediaQuery("(min-width: 1024px)");

    // Fix for hydration mismatch - start with safe default/loading state if needed, 
    // but here we just need to ensure 'x' logic is correct.
    // Framer motion handles standard 'x' values fine.

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {open && !isDesktop && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <motion.aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r shadow-xl",
                    "lg:translate-x-0 lg:shadow-none lg:border-r"
                )}
                initial={false}
                animate={{
                    width: isDesktop && collapsed ? 80 : 280,
                    x: isDesktop || open ? 0 : -280,
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                }}
            >
                <div className={cn("h-full flex flex-col items-stretch", isDesktop && collapsed ? "px-2" : "px-4")}>

                    {/* Header */}
                    <div className="flex items-center h-16 shrink-0 mt-2">
                        <Link href="/" className="flex items-center gap-3 overflow-hidden">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                                <Search className="h-5 w-5" />
                            </div>
                            {(!isDesktop || !collapsed) && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="font-bold text-lg tracking-tight"
                                >
                                    Knowledge
                                </motion.span>
                            )}
                        </Link>

                        {/* Desktop Collapse Toggle */}
                        <div className="ml-auto hidden lg:block">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => setCollapsed(!collapsed)}
                            >
                                <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
                            </Button>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto py-8 space-y-2">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary"
                                            : "text-muted-foreground hover:text-foreground",
                                        isDesktop && collapsed && "justify-center px-0"
                                    )}
                                >
                                    <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                                    {(!isDesktop || !collapsed) && (
                                        <span className="truncate">{item.name}</span>
                                    )}

                                    {isActive && (!isDesktop || !collapsed) && (
                                        <motion.div
                                            layoutId="activeNav"
                                            className="absolute left-0 w-1 h-8 rounded-r-full bg-primary"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* User Profile */}
                    <div className="border-t border-border/50 p-4">
                        {user ? (
                            <div className={cn("flex items-center gap-3", isDesktop && collapsed && "flex-col justify-center")}>
                                <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/60 p-0.5">
                                    <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                                        <span className="text-xs font-bold text-primary">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {(!isDesktop || !collapsed) && (
                                    <div className="flex-1 overflow-hidden">
                                        <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                )}

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onLogout}
                                    className={cn("text-muted-foreground hover:text-destructive", isDesktop && collapsed && "mt-2")}
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
                        )}
                    </div>
                </div>
            </motion.aside>
        </>
    );
}
