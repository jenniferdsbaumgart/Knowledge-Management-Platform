"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { knowledgeApi, analyticsApi, sourcesApi } from "@/lib/api";
import {
    FileText,
    Database,
    Search,
    MessageSquare,
    TrendingUp,
    Layers,
} from "lucide-react";

export default function DashboardPage() {
    const { data: knowledgeStats } = useQuery({
        queryKey: ["knowledge-stats"],
        queryFn: () => knowledgeApi.stats().then((res) => res.data),
    });

    const { data: analyticsData } = useQuery({
        queryKey: ["analytics-dashboard"],
        queryFn: () => analyticsApi.dashboard(30).then((res) => res.data),
    });

    const { data: sourcesData } = useQuery({
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
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                    Overview of your knowledge platform
                </p>
            </div>

            {/* Stats grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {stats.map((stat) => (
                    <Card key={stat.name}>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${stat.bg}`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">{stat.name}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Queries */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Top Queries
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {analyticsData?.insights?.topQueries?.slice(0, 5).map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-sm truncate max-w-[200px]">{item.query}</span>
                                    <span className="text-sm text-muted-foreground">{item.count} searches</span>
                                </div>
                            )) || (
                                    <p className="text-sm text-muted-foreground">No queries yet</p>
                                )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Sources */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5" />
                            Data Sources
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {sourcesData?.items?.map((source: any) => (
                                <div key={source.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{source.name}</p>
                                        <p className="text-xs text-muted-foreground">{source.type}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${source.status === 'SUCCESS' ? 'bg-green-500/10 text-green-500' :
                                            source.status === 'SYNCING' ? 'bg-blue-500/10 text-blue-500' :
                                                source.status === 'FAILED' ? 'bg-red-500/10 text-red-500' :
                                                    'bg-gray-500/10 text-gray-500'
                                        }`}>
                                        {source.status}
                                    </span>
                                </div>
                            )) || (
                                    <p className="text-sm text-muted-foreground">No sources configured</p>
                                )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
