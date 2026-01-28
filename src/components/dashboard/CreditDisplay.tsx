import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { Coins, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserCredits {
  credit_balance: number;
  monthly_credits: number;
  extra_credits: number;
  subscription_plan: string | null;
}

export function CreditDisplay({ variant = "default" }: { variant?: "default" | "compact" }) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchCredits = async () => {
      const { data } = await supabase
        .from("users")
        .select("credit_balance, monthly_credits, extra_credits, subscription_plan")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setCredits(data as UserCredits);
      }
    };

    fetchCredits();

    // Subscribe to changes
    const channel = supabase
      .channel("credit-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setCredits(payload.new as UserCredits);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!credits) return null;

  const total = (credits.monthly_credits || 0) + (credits.extra_credits || 0);
  const used = total - credits.credit_balance;
  const percentage = total > 0 ? (credits.credit_balance / total) * 100 : 0;

  const isLow = percentage < 20;
  const planName = credits.subscription_plan || "Free";

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
        <Coins className={cn("h-4 w-4", isLow ? "text-muted-foreground" : "text-foreground")} />
        <span className="text-sm font-medium">{credits.credit_balance}</span>
        <Progress value={percentage} className="w-16 h-1.5" />
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border shadow-subtle space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-lg",
            isLow ? "bg-muted" : "bg-secondary"
          )}>
            <Coins className={cn("h-4 w-4", isLow ? "text-muted-foreground" : "text-foreground")} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Credits</p>
            <p className="text-lg font-semibold">{credits.credit_balance}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent text-xs font-medium">
          <Zap className="h-3 w-3" />
          {planName}
        </div>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Used: {used}</span>
          <span>Total: {total}</span>
        </div>
        <Progress 
          value={percentage} 
          className={cn("h-2", isLow && "[&>div]:bg-warning")} 
        />
      </div>

      {isLow && (
        <p className="text-xs text-warning flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
          Low credits — consider a refill
        </p>
      )}
    </div>
  );
}
