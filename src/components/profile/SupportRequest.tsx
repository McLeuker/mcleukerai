import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RequestFeatureDialog } from "./RequestFeatureDialog";
import { Loader2, LucideIcon, Mail } from "lucide-react";

interface SupportRequestProps {
  featureType: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

type RequestStatus = "pending" | "in_progress" | "completed" | "declined" | null;

export function SupportRequest({
  featureType,
  title,
  description,
  icon: Icon,
}: SupportRequestProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<RequestStatus>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRequestStatus();
    }
  }, [user, featureType]);

  const fetchRequestStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("support_requests")
        .select("status")
        .eq("user_id", user?.id)
        .eq("request_type", featureType)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setStatus(data?.status as RequestStatus || null);
    } catch (error) {
      console.error("Error fetching request status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (message: string) => {
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("support_requests").insert({
        user_id: user.id,
        request_type: featureType,
        message: message || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "We'll review your request and respond within 24-48 hours.",
      });

      setStatus("pending");
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Request Pending</Badge>;
      case "in_progress":
        return <Badge variant="default">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-600">Enabled</Badge>;
      case "declined":
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="outline">Not Requested</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription className="mt-1.5">{description}</CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "completed" ? (
            <p className="text-sm text-green-600">
              This feature has been enabled on your account.
            </p>
          ) : status === "pending" || status === "in_progress" ? (
            <p className="text-sm text-muted-foreground">
              Your request is being reviewed. We'll notify you once it's processed.
            </p>
          ) : status === "declined" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your previous request was declined. If you believe this was in error,
                please contact support.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                Request Again
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setDialogOpen(true)}>
                Request This Feature
              </Button>
              <Button variant="outline" asChild>
                <a href="mailto:contact@mcleuker.com" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Support
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <RequestFeatureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        featureTitle={title}
        featureDescription={description}
        onSubmit={handleSubmitRequest}
        isSubmitting={submitting}
      />
    </>
  );
}
