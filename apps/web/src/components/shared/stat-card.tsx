import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        label: string;
        positive?: boolean;
    };
    className?: string;
}

export function StatCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    className,
}: StatCardProps) {
    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-baseline space-x-3">
                    <div className="text-2xl font-bold">{value}</div>
                    {trend && (
                        <div
                            className={cn(
                                "flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
                                trend.positive
                                    ? "text-emerald-500 bg-emerald-500/10"
                                    : "text-rose-500 bg-rose-500/10"
                            )}
                        >
                            {trend.value > 0 ? "+" : ""}
                            {trend.value}%
                            <span className="ml-1 text-muted-foreground hidden sm:inline">
                                {trend.label}
                            </span>
                        </div>
                    )}
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    );
}
