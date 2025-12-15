"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sourcesApi, syncApi, uploadApi } from "@/lib/api";
import { Plus, RefreshCw, Trash2, CheckCircle, XCircle, Loader2, Upload, FileText, X } from "lucide-react";

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
    const [files, setFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await sourcesApi.create(data);
            return response.data;
        },
        onSuccess: async (source) => {
            if (type === "DOCUMENT" && files.length > 0) {
                try {
                    await uploadApi.upload(source.id, files, setUploadProgress);
                } catch (error) {
                    console.error("Upload failed:", error);
                }
            }
            queryClient.invalidateQueries({ queryKey: ["sources"] });
            onClose();
        },
    });

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles((prev) => [...prev, ...droppedFiles]);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            name,
            type,
            config: type === "DOCUMENT"
                ? { type, fileCount: files.length }
                : { type, url, method: "GET" },
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
                                placeholder="My Source"
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
                                <option value="DOCUMENT">Document Upload</option>
                                <option value="WEB">Web Scraper</option>
                            </select>
                        </div>
                        {type !== "DOCUMENT" && (
                            <div>
                                <label className="text-sm font-medium">URL</label>
                                <Input
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://api.example.com"
                                    required={type !== "DOCUMENT"}
                                />
                            </div>
                        )}
                    </div>

                    {type === "DOCUMENT" && (
                        <div className="space-y-3">
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging
                                        ? "border-primary bg-primary/5"
                                        : "border-muted-foreground/25 hover:border-primary/50"
                                    }`}
                            >
                                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                    Drag & drop files here, or click to select
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    PDF, Word, Excel, Text, Markdown, JSON
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.json,.csv"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>

                            {files.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Selected Files ({files.length})</p>
                                    <div className="max-h-40 overflow-auto space-y-1">
                                        {files.map((file, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                                    <span className="truncate">{file.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({(file.size / 1024).toFixed(1)} KB)
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFile(index)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {uploadProgress > 0 && uploadProgress < 100 && (
                                <div className="space-y-1">
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">
                                        Uploading... {uploadProgress}%
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            disabled={createMutation.isPending || (type === "DOCUMENT" && files.length === 0)}
                        >
                            {createMutation.isPending ? "Creating..." : "Create Source"}
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

