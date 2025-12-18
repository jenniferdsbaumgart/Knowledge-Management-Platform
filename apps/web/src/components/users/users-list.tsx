"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usersApi } from "@/lib/api";
import { Plus, Trash2, Users, Pencil, Shield, User, UserCog } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface UserData {
    id: string;
    email: string;
    name: string;
    role: "SUPER_ADMIN" | "ADMIN" | "CLIENT";
    organisationId: string;
    createdAt: string;
}

const roleConfig = {
    SUPER_ADMIN: { label: "Super Admin", icon: Shield, color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
    ADMIN: { label: "Admin", icon: UserCog, color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
    CLIENT: { label: "Client", icon: User, color: "bg-green-500/15 text-green-600 border-green-500/30" },
};

export function UsersList() {
    const queryClient = useQueryClient();

    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    // Get current user role from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userData = localStorage.getItem("user");
            if (userData) {
                const user = JSON.parse(userData);
                setCurrentUserRole(user.role);
            }
        }
    }, []);

    // Check if user can manage users (ADMIN or SUPER_ADMIN only)
    const canManageUsers = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN';

    // Form state
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
        role: "CLIENT" as "ADMIN" | "CLIENT",
    });

    const { data: users, isLoading } = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const res = await usersApi.list();
            return res.data as UserData[];
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: typeof formData) => usersApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            resetForm();
            setShowForm(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
            usersApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setEditingUser(null);
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => usersApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
    });

    const resetForm = () => {
        setFormData({ email: "", password: "", name: "", role: "CLIENT" });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        const updateData: any = { name: formData.name, role: formData.role };
        if (formData.password) {
            updateData.password = formData.password;
        }
        updateMutation.mutate({ id: editingUser.id, data: updateData });
    };

    const startEditing = (user: UserData) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: "",
            name: user.name,
            role: user.role === "SUPER_ADMIN" ? "ADMIN" : user.role,
        });
    };

    return (
        <div className="space-y-8">
            <PageHeader
                title="User Management"
                description="Manage users in your organisation."
                action={
                    canManageUsers ? (
                        <Button onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add User
                        </Button>
                    ) : undefined
                }
            />

            {/* Create User Dialog */}
            <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                placeholder="user@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Password</label>
                            <Input
                                type="password"
                                placeholder="Min. 8 characters"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Role</label>
                            <Select
                                value={formData.role}
                                onValueChange={(value: "ADMIN" | "CLIENT") => setFormData({ ...formData, role: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="CLIENT">Client</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? "Creating..." : "Create User"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) { setEditingUser(null); resetForm(); } }}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                value={formData.email}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">New Password (optional)</label>
                            <Input
                                type="password"
                                placeholder="Leave blank to keep current"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                minLength={8}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Role</label>
                            <Select
                                value={formData.role}
                                onValueChange={(value: "ADMIN" | "CLIENT") => setFormData({ ...formData, role: value })}
                                disabled={editingUser?.role === "SUPER_ADMIN"}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="CLIENT">Client</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setEditingUser(null); resetForm(); }}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Users Grid */}
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {Array(6).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-[140px] rounded-xl" />
                        ))}
                    </motion.div>
                ) : users && users.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {users.map((user) => {
                            const config = roleConfig[user.role];
                            const Icon = config.icon;
                            return (
                                <motion.div
                                    key={user.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Card className="hover:shadow-lg transition-all group">
                                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-primary/10">
                                                    <Icon className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{user.name}</h3>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                            {canManageUsers && user.role !== "SUPER_ADMIN" && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7"
                                                        onClick={() => startEditing(user)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-red-500 hover:text-red-600"
                                                        onClick={() => deleteMutation.mutate(user.id)}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className={config.color}>
                                                    {config.label}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
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
                        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No users yet</h3>
                        <p className="text-muted-foreground">
                            {canManageUsers ? "Create your first user to get started." : "No users in this organisation."}
                        </p>
                        {canManageUsers && (
                            <Button className="mt-4" onClick={() => setShowForm(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add User
                            </Button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
