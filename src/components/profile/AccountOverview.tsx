import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Pencil, Check, X, User, Mail, Calendar, Clock, Building2, Briefcase, Camera } from "lucide-react";

interface UserData {
  name: string;
  email: string;
  profile_image: string | null;
  subscription_plan: string;
  created_at: string;
  last_login_at: string;
  auth_provider: string;
}

interface ProfileData {
  full_name: string | null;
  company?: string;
  role?: string;
}

const ROLES = [
  { value: "designer", label: "Designer" },
  { value: "brand", label: "Brand" },
  { value: "supplier", label: "Supplier" },
  { value: "consultant", label: "Consultant" },
  { value: "buyer", label: "Buyer" },
  { value: "other", label: "Other" },
];

export function AccountOverview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Editing states
  const [editingName, setEditingName] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newRole, setNewRole] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    
    try {
      // Fetch from users table
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("name, email, profile_image, subscription_plan, created_at, last_login_at, auth_provider")
        .eq("user_id", user.id)
        .single();

      if (usersError) throw usersError;
      setUserData(usersData);
      setNewName(usersData.name || "");
      
      // Fetch from profiles table for additional data
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      
      if (profilesData) {
        setProfileData(profilesData);
      }
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

      // Also update profiles table
      await supabase
        .from("profiles")
        .update({ full_name: newName.trim() })
        .eq("user_id", user.id);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    try {
      // Convert to base64 for simple storage (or use Supabase Storage in production)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        
        const { error } = await supabase
          .from("users")
          .update({ profile_image: base64Image })
          .eq("user_id", user.id);

        if (error) throw error;

        setUserData(prev => prev ? { ...prev, profile_image: base64Image } : null);
        toast({
          title: "Profile image updated",
          description: "Your profile image has been updated.",
        });
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      setUploadingImage(false);
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
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-border">
                <AvatarImage src={userData?.profile_image || undefined} />
                <AvatarFallback className="text-xl bg-muted text-foreground">
                  {getInitials(userData?.name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                {editingName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="max-w-xs bg-background"
                      placeholder="Enter your full name"
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
              <p className="text-xs text-muted-foreground">Contact support to change email</p>
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

      {/* Professional Information */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Professional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company / Organization
              </Label>
              <div className="flex items-center gap-2">
                {editingCompany ? (
                  <>
                    <Input
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      className="bg-background"
                      placeholder="Enter company name"
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => {
                        setEditingCompany(false);
                        toast({ title: "Company updated" });
                      }}
                      className="h-8 w-8"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => setEditingCompany(false)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">{newCompany || "Not specified"}</p>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => setEditingCompany(true)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Role
              </Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
