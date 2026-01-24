import { useState } from "react";
import { useSector, Sector, SECTORS } from "@/contexts/SectorContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, FileText, Globe, Sparkles } from "lucide-react";

export function Preferences() {
  const { currentSector, setSector } = useSector();
  const { toast } = useToast();
  
  const [exportFormat, setExportFormat] = useState("pdf");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [aiOutputStyle, setAiOutputStyle] = useState("balanced");
  const [aiTone, setAiTone] = useState("strategic");
  const [hasChanges, setHasChanges] = useState(false);

  const handleSavePreferences = () => {
    // In a real implementation, these would be saved to the database
    toast({
      title: "Preferences saved",
      description: "Your preferences have been updated.",
    });
    setHasChanges(false);
  };

  const updatePreference = (setter: (value: any) => void, value: any) => {
    setter(value);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Research Preferences */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Research Preferences
          </CardTitle>
          <CardDescription>
            Customize your default research settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Domain */}
          <div className="space-y-3">
            <Label>Default Research Domain</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {SECTORS.map((sector) => (
                <button
                  key={sector.id}
                  onClick={() => updatePreference(setSector, sector.id as Sector)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    currentSector === sector.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background hover:border-foreground/50"
                  }`}
                >
                  <p className="font-medium text-sm">{sector.label}</p>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Export Format */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Default Export Format
            </Label>
            <RadioGroup 
              value={exportFormat} 
              onValueChange={(v) => updatePreference(setExportFormat, v)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="cursor-pointer">PDF</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="cursor-pointer">Excel</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regional Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select 
                value={language} 
                onValueChange={(v) => updatePreference(setLanguage, v)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select 
                value={timezone} 
                onValueChange={(v) => updatePreference(setTimezone, v)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los Angeles (PST)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                  <SelectItem value="Asia/Shanghai">Asia/Shanghai (CST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Behavior */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Behavior
          </CardTitle>
          <CardDescription>
            Customize how the AI responds to your queries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Output Style</Label>
            <RadioGroup 
              value={aiOutputStyle} 
              onValueChange={(v) => updatePreference(setAiOutputStyle, v)}
              className="space-y-2"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-foreground/30 transition-colors">
                <RadioGroupItem value="concise" id="concise" className="mt-0.5" />
                <div>
                  <Label htmlFor="concise" className="cursor-pointer font-medium">Concise</Label>
                  <p className="text-sm text-muted-foreground">
                    Short, direct answers focused on key insights
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-foreground/30 transition-colors">
                <RadioGroupItem value="balanced" id="balanced" className="mt-0.5" />
                <div>
                  <Label htmlFor="balanced" className="cursor-pointer font-medium">Balanced</Label>
                  <p className="text-sm text-muted-foreground">
                    Moderate detail with context and recommendations
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-foreground/30 transition-colors">
                <RadioGroupItem value="detailed" id="detailed" className="mt-0.5" />
                <div>
                  <Label htmlFor="detailed" className="cursor-pointer font-medium">Detailed</Label>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive analysis with full methodology
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Response Tone</Label>
            <RadioGroup 
              value={aiTone} 
              onValueChange={(v) => updatePreference(setAiTone, v)}
              className="flex flex-wrap gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="strategic" id="strategic" />
                <Label htmlFor="strategic" className="cursor-pointer">Strategic</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="operational" id="operational" />
                <Label htmlFor="operational" className="cursor-pointer">Operational</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="technical" id="technical" />
                <Label htmlFor="technical" className="cursor-pointer">Technical</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSavePreferences}>
            Save Preferences
          </Button>
        </div>
      )}
    </div>
  );
}
