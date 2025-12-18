"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { organisationsApi } from "@/lib/api";
import { Plus, Trash2, Building2, Users, FileText, Sparkles, Pencil, Check, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveOrganisation } from "@/context/ActiveOrganisationContext";
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

export function OrganisationsList() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const { activeOrgId, setActiveOrgId } = useActiveOrganisation();

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
        mutationFn: async (organisationId: string) => {
            await organisationsApi.switch(organisationId);
            return organisationId;
        },
        onSuccess: (organisationId) => {
            setActiveOrgId(organisationId);
            queryClient.invalidateQueries();
            // Since this component is used on Dashboard (home), we want to redirect to Analytics
            // or just refresh the current view if it was already home. 
            // But requirement is: "Clicking one will switch to it and take you to the Analytics view."
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
                description="Manage client workspaces. Select one to view metrics and content."
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
                            <Skeleton key={i} className="h-[180px] rounded-xl" />
                        ))}
                    </motion.div>
                ) : organisations && organisations.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {organisations.map((org) => {
                            const isActive = activeOrgId === org.id;
                            return (
                                <motion.div
                                    key={org.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Card className={`hover:shadow-lg transition-all ${isActive ? 'border-primary shadow-md ring-1 ring-primary' : ''}`}>
                                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'bg-primary/10'}`}>
                                                    <Building2 className={`h-5 w-5 ${isActive ? 'text-white' : 'text-primary'}`} />
                                                </div>
                                                {editingId === org.id ? (
                                                    <div className="flex items-center gap-2">
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
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-semibold">{org.name}</h3>
                                                            {isActive && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">Active</span>}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">@{org.slug}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={() => startEditing(org)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-red-500 hover:text-red-600"
                                                    onClick={() => deleteMutation.mutate(org.id)}
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex justify-between text-sm">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Users className="h-4 w-4" />
                                                    <span>{org._count.users} users</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <FileText className="h-4 w-4" />
                                                    <span>{org._count.sources} sources</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Sparkles className="h-4 w-4" />
                                                    <span>{org._count.faqEntries} FAQs</span>
                                                </div>
                                            </div>
                                            <Button
                                                variant={isActive ? "secondary" : "default"}
                                                className="w-full"
                                                onClick={() => switchMutation.mutate(org.id)}
                                                disabled={switchMutation.isPending} // Allowed to click even if active, to "go to analytics" essentially, or re-select
                                            >
                                                {switchMutation.isPending ? "Switching..." : isActive ? "Open Workspace" : "Select Organisation"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-12"
                    >
                        <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No organisations yet</h3>
                        <p className="text-muted-foreground">Create your first organisation to get started.</p>
                        <Button className="mt-4" onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Organisation
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
