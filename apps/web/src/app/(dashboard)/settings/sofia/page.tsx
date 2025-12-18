"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sofiaApi } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Bot, Play, History, CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";

interface SofiaConfig {
    sofiaWebhookUrl: string | null;
    sofiaWebhookEnabled: boolean;
    sofiaWebhookMethod: string;
    sofiaWebhookHeaders: Record<string, string> | null;
}

interface WebhookLog {
    id: string;
    method: string;
    url: string;
    status: number | null;
    error?: string;
    duration?: number;
    sentAt: string;
}

export default function SofiaSettingsPage() {
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        sofiaWebhookUrl: "",
        sofiaWebhookEnabled: false,
        sofiaWebhookMethod: "POST",
        sofiaWebhookSecret: "",
    });

    const [syncFilter, setSyncFilter] = useState<"approved" | "draft" | "all">("approved");

    const { data: config, isLoading } = useQuery({
        queryKey: ["sofia-config"],
        queryFn: async () => {
            const res = await sofiaApi.getConfig();
            return res.data as SofiaConfig;
        },
    });

    const { data: logs, isLoading: logsLoading } = useQuery({
        queryKey: ["sofia-logs"],
        queryFn: async () => {
            const res = await sofiaApi.logs();
            return res.data as WebhookLog[];
        },
    });

    useEffect(() => {
        if (config) {
            setFormData({
                sofiaWebhookUrl: config.sofiaWebhookUrl || "",
                sofiaWebhookEnabled: config.sofiaWebhookEnabled,
                sofiaWebhookMethod: config.sofiaWebhookMethod || "POST",
                sofiaWebhookSecret: "",
            });
        }
    }, [config]);

    const updateMutation = useMutation({
        mutationFn: (data: typeof formData) => sofiaApi.updateConfig(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sofia-config"] }),
    });

    const testMutation = useMutation({
        mutationFn: () => sofiaApi.test(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sofia-logs"] });
        },
    });

    const syncMutation = useMutation({
        mutationFn: () => sofiaApi.syncFaqs(syncFilter),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sofia-logs"] });
        },
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="Sofia Integration"
                description="Configure the webhook to sync FAQs with Sofia (N8N workflow)"
            />

            <div className="grid gap-6 md:grid-cols-2">
                {/* Config Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            Webhook Configuration
                        </CardTitle>
                        <CardDescription>
                            Webhook URL from your N8N Sofia workflow
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Webhook URL</Label>
                                    <Input
                                        type="url"
                                        placeholder="https://n8n.example.com/webhook/sofia-faq"
                                        value={formData.sofiaWebhookUrl}
                                        onChange={(e) => setFormData({ ...formData, sofiaWebhookUrl: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>HTTP Method</Label>
                                    <Select
                                        value={formData.sofiaWebhookMethod}
                                        onValueChange={(v) => setFormData({ ...formData, sofiaWebhookMethod: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="POST">POST</SelectItem>
                                            <SelectItem value="PUT">PUT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Secret/Token (optional)</Label>
                                    <Input
                                        type="password"
                                        placeholder="Leave blank to keep current"
                                        value={formData.sofiaWebhookSecret}
                                        onChange={(e) => setFormData({ ...formData, sofiaWebhookSecret: e.target.value })}
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant={formData.sofiaWebhookEnabled ? "default" : "outline"}
                                        onClick={() => setFormData({ ...formData, sofiaWebhookEnabled: !formData.sofiaWebhookEnabled })}
                                    >
                                        {formData.sofiaWebhookEnabled ? "Enabled" : "Disabled"}
                                    </Button>
                                    <Button type="submit" disabled={updateMutation.isPending}>
                                        {updateMutation.isPending ? "Saving..." : "Save Configuration"}
                                    </Button>
                                </div>

                                {updateMutation.isSuccess && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 text-green-600 text-sm"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        Configuration saved!
                                    </motion.div>
                                )}
                            </form>
                        )}
                    </CardContent>
                </Card>

                {/* Actions Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Play className="h-5 w-5" />
                            Actions
                        </CardTitle>
                        <CardDescription>
                            Test the connection or sync all FAQs now
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => testMutation.mutate()}
                                    disabled={testMutation.isPending || !config?.sofiaWebhookUrl}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    {testMutation.isPending ? "Testing..." : "Test Connection"}
                                </Button>
                            </div>

                            <div className="flex gap-3 items-end border-t pt-4 mt-2">
                                <div className="grid gap-2 flex-1">
                                    <Label>Sync Scope</Label>
                                    <Select
                                        value={syncFilter}
                                        onValueChange={(v: any) => setSyncFilter(v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="approved">Approved Only</SelectItem>
                                            <SelectItem value="draft">Drafts Only</SelectItem>
                                            <SelectItem value="all">All Entries</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={() => syncMutation.mutate()}
                                    disabled={syncMutation.isPending || !config?.sofiaWebhookEnabled}
                                    className="flex-1"
                                >
                                    {syncMutation.isPending ? "Syncing..." : "Sync Now"}
                                </Button>
                            </div>
                        </div>

                        {testMutation.isSuccess && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex items-center gap-2 text-sm ${(testMutation.data?.data as any)?.success ? "text-green-600" : "text-red-600"
                                    }`}
                            >
                                {(testMutation.data?.data as any)?.success ? (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        Test successful! Status: {(testMutation.data?.data as any)?.status}
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-4 w-4" />
                                        Test failed: {(testMutation.data?.data as any)?.error}
                                    </>
                                )}
                            </motion.div>
                        )}

                        {syncMutation.isSuccess && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 text-green-600 text-sm"
                            >
                                <CheckCircle className="h-4 w-4" />
                                {(syncMutation.data?.data as any)?.message}
                            </motion.div>
                        )}
                        {syncMutation.isError && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 text-red-600 text-sm"
                            >
                                <XCircle className="h-4 w-4" />
                                {(syncMutation.error as any)?.message || "Sync failed"}
                            </motion.div>
                        )}

                        <div className="pt-4 border-t">
                            <a
                                href="https://n8n.io"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                            >
                                <ExternalLink className="h-3 w-3" />
                                Learn more about N8N webhooks
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Logs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Delivery Logs
                    </CardTitle>
                    <CardDescription>
                        Recent webhook delivery attempts
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {logsLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : logs && logs.length > 0 ? (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {logs.map((log) => (
                                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Badge variant={log.status && log.status >= 200 && log.status < 300 ? "default" : "destructive"}>
                                            {log.status || "ERR"}
                                        </Badge>
                                        <span className="text-sm font-medium">{log.method}</span>
                                        {log.duration && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {log.duration}ms
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(log.sentAt).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No logs yet</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
