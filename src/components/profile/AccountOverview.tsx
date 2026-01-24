import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Pencil, Check, X, User, Mail, Calendar, Clock } from "lucide-react";

interface UserData {
  name: string;
  email: string;
  profile_image: string | null;
  subscription_plan: string;
  created_at: string;
  last_login_at: string;
  auth_provider: string;
}

export function AccountOverview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("users")
        .select("name, email, profile_image, subscription_plan, created_at, last_login_at, auth_provider")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setUserData(data);
      setNewName(data.name || "");
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!user || !newName.trim()) return;

    try {
      const { error } = await supabase
        .from("users")
        .update({ name: newName.trim() })
        .eq("user_id", user.id);

      if (error) throw error;

      setUserData(prev => prev ? { ...prev, name: newName.trim() } : null);
      setEditingName(false);
      toast({
        title: "Name updated",
        description: "Your name has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating name:", error);
      toast({
        title: "Update failed",
        description: "Failed to update your name. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case "pro":
        return "default";
      case "studio":
        return "secondary";
      case "enterprise":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-card rounded-lg" />
        <div className="h-32 bg-card rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar & Name Section */}
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarImage src={userData?.profile_image || undefined} />
              <AvatarFallback className="text-lg bg-muted text-foreground">
                {getInitials(userData?.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                {editingName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="max-w-xs bg-background"
                      placeholder="Enter your name"
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={handleUpdateName}
                      className="h-8 w-8"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => {
                        setEditingName(false);
                        setNewName(userData?.name || "");
                      }}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-serif font-light">
                      {userData?.name || "Unnamed User"}
                    </h2>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => setEditingName(true)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={getPlanBadgeVariant(userData?.subscription_plan || "free")}>
                  {userData?.subscription_plan?.toUpperCase() || "FREE"}
                </Badge>
                {userData?.auth_provider && userData.auth_provider !== "email" && (
                  <Badge variant="outline" className="text-xs">
                    {userData.auth_provider.charAt(0).toUpperCase() + userData.auth_provider.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Details */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <p className="text-sm font-medium">{userData?.email}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Account Type
              </Label>
              <p className="text-sm font-medium capitalize">
                {userData?.subscription_plan || "Free"} Plan
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Member Since
              </Label>
              <p className="text-sm font-medium">
                {userData?.created_at 
                  ? format(new Date(userData.created_at), "MMMM d, yyyy")
                  : "—"
                }
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Last Login
              </Label>
              <p className="text-sm font-medium">
                {userData?.last_login_at 
                  ? format(new Date(userData.last_login_at), "MMM d, yyyy 'at' h:mm a")
                  : "—"
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
