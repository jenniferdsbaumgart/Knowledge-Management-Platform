"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sourcesApi, syncApi } from "@/lib/api";
import { Plus, RefreshCw, Trash2, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function SourcesPage() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);

    const { data: sources, isLoading } = useQuery({
        queryKey: ["sources"],
        queryFn: () => sourcesApi.list().then((res) => res.data),
    });

    const syncMutation = useMutation({
        mutationFn: (sourceId: string) => syncApi.trigger(sourceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sources"] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (sourceId: string) => sourcesApi.delete(sourceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sources"] });
        },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Data Sources</h1>
                    <p className="text-muted-foreground">
                        Manage your knowledge base data sources
                    </p>
                </div>
                <Button onClick={() => setShowForm(!showForm)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Source
                </Button>
            </div>

            {showForm && <AddSourceForm onClose={() => setShowForm(false)} />}

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : sources?.items?.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground mb-4">No data sources configured yet</p>
                        <Button onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add your first source
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sources?.items?.map((source: any) => (
                        <Card key={source.id}>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="truncate">{source.name}</span>
                                    <StatusBadge status={source.status} />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <span className="font-medium mr-2">Type:</span>
                                        {source.type}
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <span className="font-medium mr-2">Documents:</span>
                                        {source._count?.documents || 0}
                                    </div>
                                    {source.lastSyncAt && (
                                        <div className="text-xs text-muted-foreground">
                                            Last synced: {new Date(source.lastSyncAt).toLocaleString()}
                                        </div>
                                    )}
                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => syncMutation.mutate(source.id)}
                                            disabled={syncMutation.isPending || source.status === 'SYNCING'}
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-1 ${source.status === 'SYNCING' ? 'animate-spin' : ''}`} />
                                            Sync
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => deleteMutation.mutate(source.id)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
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

function StatusBadge({ status }: { status: string }) {
    const config = {
        SUCCESS: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
        SYNCING: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-500/10" },
        FAILED: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
        IDLE: { icon: null, color: "text-gray-500", bg: "bg-gray-500/10" },
    }[status] || { icon: null, color: "text-gray-500", bg: "bg-gray-500/10" };

    return (
        <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.color} flex items-center gap-1`}>
            {config.icon && <config.icon className={`w-3 h-3 ${status === 'SYNCING' ? 'animate-spin' : ''}`} />}
            {status}
        </span>
    );
}

function AddSourceForm({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [type, setType] = useState("API");
    const [url, setUrl] = useState("");

    const mutation = useMutation({
        mutationFn: (data: any) => sourcesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sources"] });
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            name,
            type,
            config: { type, url, method: "GET" },
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add New Source</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="My API Source"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="API">API</option>
                                <option value="DOCUMENT">Document</option>
                                <option value="WEB">Web Scraper</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">URL / Path</label>
                            <Input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://api.example.com"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? "Creating..." : "Create Source"}
                        </Button>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
