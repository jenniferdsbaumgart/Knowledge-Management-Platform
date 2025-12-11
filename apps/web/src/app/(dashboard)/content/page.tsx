"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cmsApi } from "@/lib/api";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ContentPage() {
    const queryClient = useQueryClient();
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: contents, isLoading } = useQuery({
        queryKey: ["cms-contents"],
        queryFn: () => cmsApi.list().then((res) => res.data),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => cmsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cms-contents"] });
        },
    });

    const publishMutation = useMutation({
        mutationFn: ({ id, action }: { id: string; action: "publish" | "unpublish" }) =>
            action === "publish" ? cmsApi.publish(id) : cmsApi.unpublish(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cms-contents"] });
        },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Content</h1>
                    <p className="text-muted-foreground">
                        Manage your knowledge base content
                    </p>
                </div>
                <Button onClick={() => { setShowEditor(true); setEditingId(null); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Content
                </Button>
            </div>

            {showEditor && (
                <ContentEditor
                    id={editingId}
                    onClose={() => { setShowEditor(false); setEditingId(null); }}
                />
            )}

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : contents?.items?.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground mb-4">No content created yet</p>
                        <Button onClick={() => setShowEditor(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create your first content
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {contents?.items?.map((content: any) => (
                        <Card key={content.id}>
                            <CardContent className="py-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium truncate">{content.title}</h3>
                                            <StatusBadge status={content.status} />
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            /{content.slug} • by {content.author?.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Updated {formatDistanceToNow(new Date(content.updatedAt), { addSuffix: true })}
                                            {" • "}Version {content.version}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {content.status === "PUBLISHED" ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => publishMutation.mutate({ id: content.id, action: "unpublish" })}
                                            >
                                                Unpublish
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => publishMutation.mutate({ id: content.id, action: "publish" })}
                                            >
                                                Publish
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => { setEditingId(content.id); setShowEditor(true); }}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => deleteMutation.mutate(content.id)}
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
        PUBLISHED: { color: "text-green-500", bg: "bg-green-500/10" },
        DRAFT: { color: "text-yellow-500", bg: "bg-yellow-500/10" },
        REVIEW: { color: "text-blue-500", bg: "bg-blue-500/10" },
        ARCHIVED: { color: "text-gray-500", bg: "bg-gray-500/10" },
    }[status] || { color: "text-gray-500", bg: "bg-gray-500/10" };

    return (
        <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
            {status}
        </span>
    );
}

function ContentEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [body, setBody] = useState("");

    const { data: content, isLoading: loadingContent } = useQuery({
        queryKey: ["cms-content", id],
        queryFn: () => cmsApi.get(id!).then((res) => res.data),
        enabled: !!id,
    });

    // Show loading when fetching content for edit
    if (loadingContent) {
        return (
            <Card>
                <CardContent className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    // Set form values when editing
    useEffect(() => {
        if (content && id) {
            setTitle(content.title || "");
            setSlug(content.slug || "");
            setBody(content.body || "");
        }
    }, [content, id]);

    const mutation = useMutation({
        mutationFn: (data: any) => id ? cmsApi.update(id, data) : cmsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cms-contents"] });
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ title, slug, body });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{id ? "Edit Content" : "New Content"}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Title</label>
                            <Input
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    if (!id) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                                }}
                                placeholder="My Article"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Slug</label>
                            <Input
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="my-article"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Body</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[200px]"
                            placeholder="Write your content here..."
                            required
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? "Saving..." : id ? "Update" : "Create"}
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
