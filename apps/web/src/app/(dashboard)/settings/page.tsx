"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Key, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
    const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333/api/v1");
    const [openaiKey, setOpenaiKey] = useState("");
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        // In a real app, this would save to backend
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground">
                    Configure your knowledge platform
                </p>
            </div>

            <div className="grid gap-6">
                {/* API Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            API Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">API Base URL</label>
                            <Input
                                value={apiUrl}
                                onChange={(e) => setApiUrl(e.target.value)}
                                placeholder="http://localhost:3333/api/v1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                The base URL for the Knowledge Platform API
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            AI Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">OpenAI API Key</label>
                            <Input
                                type="password"
                                value={openaiKey}
                                onChange={(e) => setOpenaiKey(e.target.value)}
                                placeholder="sk-..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Your OpenAI API key for embeddings and RAG responses
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-sm font-medium">Embedding Model</label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="text-embedding-3-small">text-embedding-3-small</option>
                                    <option value="text-embedding-3-large">text-embedding-3-large</option>
                                    <option value="text-embedding-ada-002">text-embedding-ada-002</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-sm font-medium">Chat Model</label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="gpt-4">GPT-4</option>
                                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Notifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Sync Notifications</p>
                                <p className="text-sm text-muted-foreground">
                                    Get notified when sync jobs complete or fail
                                </p>
                            </div>
                            <input type="checkbox" className="h-4 w-4" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Weekly Reports</p>
                                <p className="text-sm text-muted-foreground">
                                    Receive weekly analytics summaries
                                </p>
                            </div>
                            <input type="checkbox" className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Security
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Webhook Secret</label>
                            <Input type="password" placeholder="••••••••••••••••" />
                            <p className="text-xs text-muted-foreground mt-1">
                                Secret key for validating incoming webhooks
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave}>
                    {saved ? "Saved!" : "Save Settings"}
                </Button>
            </div>
        </div>
    );
}
