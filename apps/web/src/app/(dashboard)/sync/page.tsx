"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { syncApi } from "@/lib/api";
import { CheckCircle, XCircle, Loader2, Clock, FileText, Layers } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function SyncPage() {
    const { data: logs, isLoading } = useQuery({
        queryKey: ["sync-logs"],
        queryFn: () => syncApi.logs({ limit: 50 }).then((res) => res.data),
        refetchInterval: 5000, // Refresh every 5 seconds
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Sync Status</h1>
                <p className="text-muted-foreground">
                    Monitor synchronization jobs and history
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : logs?.items?.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No sync jobs have run yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Go to Sources and trigger a sync to get started
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {logs?.items?.map((log: any) => (
                        <Card key={log.id}>
                            <CardContent className="py-4">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                        <StatusIcon status={log.status} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{log.source?.name || "Unknown"}</span>
                                            <StatusBadge status={log.status} />
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            Started {formatDistanceToNow(new Date(log.startedAt), { addSuffix: true })}
                                            {log.completedAt && (
                                                <span>
                                                    {" • "}
                                                    Completed {formatDistanceToNow(new Date(log.completedAt), { addSuffix: true })}
                                                </span>
                                            )}
                                        </div>
                                        {log.status === "COMPLETED" && (
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <FileText className="w-4 h-4" />
                                                    {log.documentsCount} documents
                                                </div>
                                                <div className="flex items-center gap-1 text-blue-600">
                                                    <Layers className="w-4 h-4" />
                                                    {log.chunksCount} chunks
                                                </div>
                                            </div>
                                        )}
                                        {log.errorMessage && (
                                            <div className="mt-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                                {log.errorMessage}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case "COMPLETED":
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        case "STARTED":
            return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
        case "FAILED":
            return <XCircle className="w-5 h-5 text-red-500" />;
        default:
            return <Clock className="w-5 h-5 text-gray-500" />;
    }
}

function StatusBadge({ status }: { status: string }) {
    const config = {
        COMPLETED: { color: "text-green-500", bg: "bg-green-500/10" },
        STARTED: { color: "text-blue-500", bg: "bg-blue-500/10" },
        FAILED: { color: "text-red-500", bg: "bg-red-500/10" },
    }[status] || { color: "text-gray-500", bg: "bg-gray-500/10" };

    return (
        <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
            {status}
        </span>
    );
}
