"use client";

import { Button } from "@/components/ui/button";
import { Menu, Moon, Sun, Bell, Search } from "lucide-react";
import { useTheme } from "next-themes";

interface HeaderProps {
    onOpenSidebar: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
    const { theme, setTheme } = useTheme();

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 bg-background/60 px-6 backdrop-blur-xl transition-all border-b border-border/40">
            <Button
                variant="ghost"
                size="icon"
                className="lg:hidden -ml-2 text-muted-foreground"
                onClick={onOpenSidebar}
            >
                <Menu className="h-5 w-5" />
            </Button>

            {/* Global Search Trigger (Visual only for now, will implement Command Palette later) */}
            <div className="flex-1 md:flex-none">
                <div className="relative md:w-64 lg:w-96">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <button className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-background/50 px-3 py-1 pl-9 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                        <span className="hidden lg:inline-flex">Search documentation...</span>
                        <span className="inline-flex lg:hidden">Search...</span>
                        <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </button>
                </div>
            </div>

            <div className="flex flex-1 justify-end items-center gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>
        </header>
    );
}
