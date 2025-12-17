"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { organisationsApi } from "@/lib/api";
import { Plus, Trash2, Building2, Users, FileText, Sparkles, Pencil, Check, X, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

interface Organisation {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    _count: {
        users: number;
        sources: number;
        faqEntries: number;
    };
}

export function SuperAdminView() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [showForm, setShowForm] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const { data: organisations, isLoading } = useQuery({
        queryKey: ["organisations"],
        queryFn: async () => {
            const res = await organisationsApi.list();
            return res.data as Organisation[];
        },
    });

    const createMutation = useMutation({
        mutationFn: (name: string) => organisationsApi.create({ name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organisations"] });
            setNewOrgName("");
            setShowForm(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) =>
            organisationsApi.update(id, { name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organisations"] });
            setEditingId(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => organisationsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organisations"] });
        },
    });

    const switchMutation = useMutation({
        mutationFn: (organisationId: string) => organisationsApi.switch(organisationId),
        onSuccess: () => {
            // Invalidate all queries to refresh data with new org context
            queryClient.invalidateQueries();
            // Redirect to analytics dashboard for the selected organisation
            router.push('/analytics');
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newOrgName.trim()) {
            createMutation.mutate(newOrgName.trim());
        }
    };

    const startEditing = (org: Organisation) => {
        setEditingId(org.id);
        setEditName(org.name);
    };

    const saveEdit = () => {
        if (editingId && editName.trim()) {
            updateMutation.mutate({ id: editingId, name: editName.trim() });
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader
                title="Organisation Hub"
                description="Select an organisation to manage its knowledge base."
                action={
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Organisation
                    </Button>
                }
            />

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Create New Organisation</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <Input
                            placeholder="Organisation name"
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || !newOrgName.trim()}>
                                {createMutation.isPending ? "Creating..." : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {Array(3).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-[200px] rounded-xl" />
                        ))}
                    </motion.div>
                ) : organisations && organisations.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {organisations.map((org) => (
                            <motion.div
                                key={org.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="group relative"
                            >
                                <Card className="hover:shadow-lg transition-all border-primary/10 hover:border-primary/50 cursor-pointer h-full"
                                    onClick={() => {
                                        if (editingId !== org.id) {
                                            switchMutation.mutate(org.id);
                                        }
                                    }}
                                >
                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <Building2 className="h-6 w-6 text-primary group-hover:text-current" />
                                            </div>
                                            {editingId === org.id ? (
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Input
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="h-8 w-36"
                                                    />
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                                                        <Check className="h-4 w-4 text-green-500" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                                                        <X className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-lg">{org.name}</h3>
                                                    <p className="text-xs text-muted-foreground">@{org.slug}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                onClick={() => startEditing(org)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => deleteMutation.mutate(org.id)}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6 pt-4">
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-background transition-colors">
                                                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                                                    <Users className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="font-bold block">{org._count.users}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Users</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-background transition-colors">
                                                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                                                    <FileText className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="font-bold block">{org._count.sources}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sources</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-background transition-colors">
                                                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="font-bold block">{org._count.faqEntries}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">FAQs</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                                            {switchMutation.isPending ? "Opening..." : "Open Dashboard"}
                                            <ArrowRight className="ml-1 h-4 w-4" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-16 bg-muted/20 rounded-xl border-2 border-dashed border-muted"
                    >
                        <Building2 className="mx-auto h-16 w-16 text-muted-foreground/50" />
                        <h3 className="mt-4 text-xl font-semibold">Welcome to your Platform Hub</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Create your first client organisation to get started managing their knowledge.</p>
                        <Button className="mt-6" size="lg" onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Organisation
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
