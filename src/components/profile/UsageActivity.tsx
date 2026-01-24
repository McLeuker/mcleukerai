import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { CREDIT_COSTS } from "@/config/pricing";
import { format } from "date-fns";
import { 
  BarChart3, 
  Search, 
  TrendingUp, 
  FileText, 
  Users,
  Download,
  Clock
} from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  balance_after: number;
  created_at: string;
}

interface Task {
  id: string;
  prompt: string;
  status: string;
  created_at: string;
}

interface UsageBreakdown {
  ai_research_query: number;
  market_analysis: number;
  trend_report: number;
  supplier_search: number;
  pdf_export: number;
  excel_export: number;
}

export function UsageActivity() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [usageBreakdown, setUsageBreakdown] = useState<UsageBreakdown>({
    ai_research_query: 0,
    market_analysis: 0,
    trend_report: 0,
    supplier_search: 0,
    pdf_export: 0,
    excel_export: 0,
  });
  const [totalQueriesThisMonth, setTotalQueriesThisMonth] = useState(0);
  const [totalCreditsUsed, setTotalCreditsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUsageData();
    }
  }, [user]);

  const fetchUsageData = async () => {
    if (!user) return;

    try {
      // Fetch recent transactions (usage type only)
      const { data: txData, error: txError } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "usage")
        .order("created_at", { ascending: false })
        .limit(50);

      if (txError) throw txError;
      setTransactions(txData || []);

      // Calculate usage breakdown from transactions
      const breakdown: UsageBreakdown = {
        ai_research_query: 0,
        market_analysis: 0,
        trend_report: 0,
        supplier_search: 0,
        pdf_export: 0,
        excel_export: 0,
      };

      let totalCredits = 0;
      (txData || []).forEach(tx => {
        totalCredits += Math.abs(tx.amount);
        
        // Parse description to categorize
        const desc = tx.description?.toLowerCase() || "";
        if (desc.includes("research") || desc.includes("query")) {
          breakdown.ai_research_query += Math.abs(tx.amount);
        } else if (desc.includes("market")) {
          breakdown.market_analysis += Math.abs(tx.amount);
        } else if (desc.includes("trend")) {
          breakdown.trend_report += Math.abs(tx.amount);
        } else if (desc.includes("supplier")) {
          breakdown.supplier_search += Math.abs(tx.amount);
        } else if (desc.includes("pdf")) {
          breakdown.pdf_export += Math.abs(tx.amount);
        } else if (desc.includes("excel")) {
          breakdown.excel_export += Math.abs(tx.amount);
        }
      });

      setUsageBreakdown(breakdown);
      setTotalCreditsUsed(totalCredits);
      setTotalQueriesThisMonth(txData?.length || 0);

      // Fetch recent tasks
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("id, prompt, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (taskError) throw taskError;
      setRecentTasks(taskData || []);

    } catch (error) {
      console.error("Error fetching usage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (key: string) => {
    switch (key) {
      case "ai_research_query":
        return <Search className="h-4 w-4" />;
      case "market_analysis":
        return <BarChart3 className="h-4 w-4" />;
      case "trend_report":
        return <TrendingUp className="h-4 w-4" />;
      case "supplier_search":
        return <Users className="h-4 w-4" />;
      case "pdf_export":
      case "excel_export":
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatActionName = (key: string) => {
    return key.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-card rounded-lg" />
        <div className="h-64 bg-card rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Usage Summary */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Usage Summary
          </CardTitle>
          <CardDescription>
            Your activity this billing period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50 space-y-1">
              <p className="text-sm text-muted-foreground">Total Queries</p>
              <p className="text-3xl font-light">{totalQueriesThisMonth}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 space-y-1">
              <p className="text-sm text-muted-foreground">Credits Consumed</p>
              <p className="text-3xl font-light">{totalCreditsUsed.toLocaleString()}</p>
            </div>
          </div>

          <Separator />

          {/* Breakdown by Action Type */}
          <div className="space-y-4">
            <h4 className="font-medium">Credits by Action Type</h4>
            <div className="space-y-3">
              {Object.entries(usageBreakdown).map(([key, value]) => {
                const actionConfig = CREDIT_COSTS[key as keyof typeof CREDIT_COSTS];
                if (!actionConfig || value === 0) return null;
                
                return (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-muted">
                        {getActionIcon(key)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{actionConfig.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {actionConfig.credits} credits per action
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{value} credits</Badge>
                  </div>
                );
              })}
              
              {Object.values(usageBreakdown).every(v => v === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No usage recorded yet this period
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Tasks */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Tasks
              </CardTitle>
              <CardDescription>
                Your last 10 research tasks
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" disabled>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentTasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Task</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTasks.map((task) => (
                  <TableRow key={task.id} className="border-border">
                    <TableCell className="max-w-[300px]">
                      <p className="truncate text-sm">{task.prompt}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge 
                        variant={task.status === "completed" ? "default" : "outline"}
                        className="text-xs"
                      >
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(task.created_at), "MMM d")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No tasks yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your research history will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
