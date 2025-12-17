"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { knowledgeApi, analyticsApi, sourcesApi, authApi } from "@/lib/api";
import {
    FileText,
    Database,
    Search,
    MessageSquare,
    TrendingUp,
    Layers,
    ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SuperAdminView } from "@/components/dashboard/super-admin-view";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
};

function TenantDashboard() {
    const { data: knowledgeStats, isLoading: statsLoading } = useQuery({
        queryKey: ["knowledge-stats"],
        queryFn: () => knowledgeApi.stats().then((res) => res.data),
    });

    const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
        queryKey: ["analytics-dashboard"],
        queryFn: () => analyticsApi.dashboard(30).then((res) => res.data),
    });

    const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
        queryKey: ["sources"],
        queryFn: () => sourcesApi.list({ limit: 5 }).then((res) => res.data),
    });

    const stats = [
        {
            name: "Total Documents",
            value: knowledgeStats?.totalDocuments || 0,
            icon: FileText,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
        },
        {
            name: "Total Chunks",
            value: knowledgeStats?.totalChunks || 0,
            icon: Layers,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
        },
        {
            name: "Data Sources",
            value: sourcesData?.total || 0,
            icon: Database,
            color: "text-green-500",
            bg: "bg-green-500/10",
        },
        {
            name: "Searches (30d)",
            value: analyticsData?.metrics?.totalSearches || 0,
            icon: Search,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
        },
        {
            name: "RAG Queries (30d)",
            value: analyticsData?.metrics?.totalRagQueries || 0,
            icon: MessageSquare,
            color: "text-pink-500",
            bg: "bg-pink-500/10",
        },
    ];

    return (
        <div className="space-y-8">
            <PageHeader
                title="Dashboard"
                description="Overview of your knowledge platform metrics and performance."
                action={
                    <Button asChild>
                        <Link href="/sources">
                            Connect Source
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                }
            />

            {/* Stats grid */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
            >
                {stats.map((stat) => (
                    <motion.div key={stat.name} variants={item}>
                        {statsLoading || analyticsLoading || sourcesLoading ? (
                            <Skeleton className="h-[120px] w-full rounded-xl" />
                        ) : (
                            <StatCard
                                title={stat.name}
                                value={stat.value.toLocaleString()}
                                icon={stat.icon}
                                className="h-full transition-shadow hover:shadow-md"
                            />
                        )}
                    </motion.div>
                ))}
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Queries */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                </div>
                                Top Queries
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {analyticsLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <Skeleton className="h-4 w-[200px]" />
                                            <Skeleton className="h-4 w-[60px]" />
                                        </div>
                                    ))
                                ) : (
                                    analyticsData?.insights?.topQueries?.slice(0, 5).map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-medium text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                    {i + 1}
                                                </div>
                                                <span className="text-sm font-medium truncate max-w-[200px]">{item.query}</span>
                                            </div>
                                            <Badge variant="secondary" className="font-mono">
                                                {item.count}
                                            </Badge>
                                        </div>
                                    )) || (
                                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                            <Search className="h-8 w-8 mb-2 opacity-20" />
                                            <p>No queries recorded yet</p>
                                        </div>
                                    )
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Recent Sources */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Database className="w-5 h-5 text-primary" />
                                </div>
                                Data Sources
                            </CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/sources">View All</Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {sourcesLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-[150px]" />
                                                <Skeleton className="h-3 w-[100px]" />
                                            </div>
                                            <Skeleton className="h-5 w-[60px]" />
                                        </div>
                                    ))
                                ) : (
                                    sourcesData?.items?.map((source: any) => (
                                        <div key={source.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-background border flex items-center justify-center">
                                                    {source.type === 'API' && <Search className="h-5 w-5 text-blue-500" />}
                                                    {source.type === 'DATABASE' && <Database className="h-5 w-5 text-green-500" />}
                                                    {source.type === 'DOCUMENT' && <FileText className="h-5 w-5 text-orange-500" />}
                                                    {source.type === 'WEB' && <Layers className="h-5 w-5 text-purple-500" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{source.name}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">{source.type}</p>
                                                </div>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    source.status === 'SUCCESS' ? 'border-green-500/50 text-green-700 bg-green-500/10 dark:text-green-400' :
                                                        source.status === 'SYNCING' ? 'border-blue-500/50 text-blue-700 bg-blue-500/10 dark:text-blue-400 animate-pulse' :
                                                            source.status === 'FAILED' ? 'border-red-500/50 text-red-700 bg-red-500/10 dark:text-red-400' :
                                                                'border-gray-500/50 text-gray-700 bg-gray-500/10 dark:text-gray-400'
                                                }
                                            >
                                                {source.status}
                                            </Badge>
                                        </div>
                                    )) || (
                                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                            <Database className="h-8 w-8 mb-2 opacity-20" />
                                            <p>No sources configured</p>
                                            <Button variant="link" size="sm" asChild className="mt-2">
                                                <Link href="/sources">Add your first source</Link>
                                            </Button>
                                        </div>
                                    )
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { data: user, isLoading } = useQuery({
        queryKey: ["user"],
        queryFn: () => authApi.me().then((res) => res.data),
    });

    if (isLoading) {
        return <div className="p-8 space-y-8">
            <Skeleton className="h-12 w-64" />
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        </div>;
    }

    if (user?.role === 'SUPER_ADMIN') {
        return <SuperAdminView />;
    }

    return <TenantDashboard />;
}
