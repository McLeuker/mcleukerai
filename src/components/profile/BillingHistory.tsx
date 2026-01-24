import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { Receipt, Download, ExternalLink, CreditCard } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  balance_after: number;
  created_at: string;
}

export function BillingHistory() {
  const { user } = useAuth();
  const { openCustomerPortal, subscribed } = useSubscription();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBillingHistory();
    }
  }, [user]);

  const fetchBillingHistory = async () => {
    if (!user) return;

    try {
      // Fetch billing-related transactions (purchases and subscription resets)
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .in("type", ["purchase", "subscription_reset", "refill"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching billing history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "purchase":
      case "refill":
        return <Badge variant="default">Purchase</Badge>;
      case "subscription_reset":
        return <Badge variant="outline">Subscription</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatAmount = (amount: number, type: string) => {
    // For subscription reset, no monetary value to show
    if (type === "subscription_reset") {
      return `+${amount} credits`;
    }
    // For purchases, estimate price (this would ideally come from Stripe)
    if (type === "purchase" || type === "refill") {
      return `+${amount} credits`;
    }
    return `${amount} credits`;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-card rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Overview */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Billing History
              </CardTitle>
              <CardDescription>
                View your transactions and download invoices
              </CardDescription>
            </div>
            {subscribed && (
              <Button variant="outline" onClick={openCustomerPortal}>
                <CreditCard className="h-4 w-4 mr-2" />
                Billing Portal
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border">
                    <TableCell className="text-sm">
                      {format(new Date(tx.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-sm">
                        {tx.description || getDefaultDescription(tx.type)}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {getTransactionBadge(tx.type)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-500">
                      {formatAmount(tx.amount, tx.type)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No billing history yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Transactions will appear here once you make a purchase
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Access Note */}
      {subscribed && (
        <Card className="border-border bg-card">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-md bg-muted">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium">Need invoices?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Access your complete invoice history and download PDFs through the billing portal.
                </p>
                <Button 
                  variant="link" 
                  className="px-0 mt-2" 
                  onClick={openCustomerPortal}
                >
                  Open Billing Portal
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getDefaultDescription(type: string): string {
  switch (type) {
    case "purchase":
    case "refill":
      return "Credit refill pack";
    case "subscription_reset":
      return "Monthly credit allocation";
    default:
      return "Transaction";
  }
}
