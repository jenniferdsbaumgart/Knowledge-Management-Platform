"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { analyticsApi } from "@/lib/api";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Search, MessageSquare, ThumbsUp, ThumbsDown, TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
    const { data: analytics, isLoading } = useQuery({
        queryKey: ["analytics-dashboard", 30],
        queryFn: () => analyticsApi.dashboard(30).then((res) => res.data),
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const searchesByDay = analytics?.charts?.searchesByDay || [];
    const feedback = analytics?.insights?.feedback || { positive: 0, negative: 0 };

    const feedbackData = [
        { name: "Positive", value: feedback.positive, color: "#22c55e" },
        { name: "Negative", value: feedback.negative, color: "#ef4444" },
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Analytics</h1>
                <p className="text-muted-foreground">
                    Usage metrics and insights for the last 30 days
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-500/10">
                                <Search className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {analytics?.metrics?.totalSearches || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Total Searches</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-purple-500/10">
                                <MessageSquare className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {analytics?.metrics?.totalRagQueries || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">RAG Queries</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-green-500/10">
                                <ThumbsUp className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{feedback.positive}</p>
                                <p className="text-sm text-muted-foreground">Positive Feedback</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-red-500/10">
                                <ThumbsDown className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{feedback.negative}</p>
                                <p className="text-sm text-muted-foreground">Negative Feedback</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Searches over time */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Search Activity Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={searchesByDay}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="date" className="text-xs" />
                                    <YAxis className="text-xs" />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="searches"
                                        stroke="#8884d8"
                                        strokeWidth={2}
                                        name="Searches"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="ragQueries"
                                        stroke="#82ca9d"
                                        strokeWidth={2}
                                        name="RAG Queries"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Queries */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Top Queries
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics?.insights?.topQueries?.slice(0, 10).map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-4">
                                    <span className="text-sm font-medium text-muted-foreground w-6">
                                        {i + 1}.
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate">{item.query}</p>
                                        <div className="h-2 bg-muted rounded-full mt-1 overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full"
                                                style={{
                                                    width: `${(item.count / (analytics?.insights?.topQueries?.[0]?.count || 1)) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-sm text-muted-foreground">{item.count}</span>
                                </div>
                            )) || <p className="text-sm text-muted-foreground">No queries yet</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* Feedback pie */}
                <Card>
                    <CardHeader>
                        <CardTitle>Feedback Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {feedbackData.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={feedbackData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label
                                        >
                                            {feedbackData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No feedback data yet
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
