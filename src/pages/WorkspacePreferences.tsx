import { useState } from "react";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { useSector, Sector, SECTORS } from "@/contexts/SectorContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, FileText, Globe, Sparkles, Clock, Check } from "lucide-react";

const WorkspacePreferences = () => {
  const { currentSector, setSector } = useSector();
  const { toast } = useToast();
  
  const [exportFormat, setExportFormat] = useState("pdf");
  const [outputStyle, setOutputStyle] = useState("strategic");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [aiDetail, setAiDetail] = useState("detailed");

  const handleSave = () => {
    toast({
      title: "Preferences saved",
      description: "Your workspace preferences have been updated.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation showSectorTabs={false} showCredits={false} />
      
      <div className="h-14 lg:h-[72px]" />
      
      <main className="max-w-3xl mx-auto px-4 py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8 lg:mb-12">
          <h1 className="text-3xl lg:text-4xl font-serif font-light tracking-tight">
            Workspace Preferences
          </h1>
          <p className="text-muted-foreground mt-2">
            Customize your research experience
          </p>
        </div>

        <div className="space-y-6">
          {/* Default Research Domain */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Default Research Domain
              </CardTitle>
              <CardDescription>
                Your preferred industry focus for AI research
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={currentSector} 
                onValueChange={(value) => setSector(value as Sector)}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {SECTORS.map((sector) => (
                  <Label
                    key={sector.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      currentSector === sector.id 
                        ? "border-foreground bg-foreground/5" 
                        : "border-border hover:border-foreground/50"
                    }`}
                  >
                    <RadioGroupItem value={sector.id} className="sr-only" />
                    <span className="text-sm font-medium">{sector.label}</span>
                    {currentSector === sector.id && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Export Format */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Default Export Format
              </CardTitle>
              <CardDescription>
                Preferred format for downloading reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={exportFormat} 
                onValueChange={setExportFormat}
                className="flex gap-4"
              >
                <Label
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors flex-1 ${
                    exportFormat === "pdf" 
                      ? "border-foreground bg-foreground/5" 
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  <RadioGroupItem value="pdf" className="sr-only" />
                  <div>
                    <span className="text-sm font-medium">PDF</span>
                    <p className="text-xs text-muted-foreground">Best for sharing</p>
                  </div>
                  {exportFormat === "pdf" && <Check className="h-4 w-4 ml-auto" />}
                </Label>
                <Label
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors flex-1 ${
                    exportFormat === "excel" 
                      ? "border-foreground bg-foreground/5" 
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  <RadioGroupItem value="excel" className="sr-only" />
                  <div>
                    <span className="text-sm font-medium">Excel</span>
                    <p className="text-xs text-muted-foreground">Best for analysis</p>
                  </div>
                  {exportFormat === "excel" && <Check className="h-4 w-4 ml-auto" />}
                </Label>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Output Style */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Output Style
              </CardTitle>
              <CardDescription>
                Customize how AI responses are structured
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">Response Tone</Label>
                <RadioGroup 
                  value={outputStyle} 
                  onValueChange={setOutputStyle}
                  className="flex gap-4"
                >
                  <Label
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors flex-1 ${
                      outputStyle === "strategic" 
                        ? "border-foreground bg-foreground/5" 
                        : "border-border hover:border-foreground/50"
                    }`}
                  >
                    <RadioGroupItem value="strategic" className="sr-only" />
                    <div>
                      <span className="text-sm font-medium">Strategic</span>
                      <p className="text-xs text-muted-foreground">High-level insights</p>
                    </div>
                    {outputStyle === "strategic" && <Check className="h-4 w-4 ml-auto" />}
                  </Label>
                  <Label
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors flex-1 ${
                      outputStyle === "operational" 
                        ? "border-foreground bg-foreground/5" 
                        : "border-border hover:border-foreground/50"
                    }`}
                  >
                    <RadioGroupItem value="operational" className="sr-only" />
                    <div>
                      <span className="text-sm font-medium">Operational</span>
                      <p className="text-xs text-muted-foreground">Actionable details</p>
                    </div>
                    {outputStyle === "operational" && <Check className="h-4 w-4 ml-auto" />}
                  </Label>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">Response Length</Label>
                <RadioGroup 
                  value={aiDetail} 
                  onValueChange={setAiDetail}
                  className="flex gap-4"
                >
                  <Label
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors flex-1 ${
                      aiDetail === "concise" 
                        ? "border-foreground bg-foreground/5" 
                        : "border-border hover:border-foreground/50"
                    }`}
                  >
                    <RadioGroupItem value="concise" className="sr-only" />
                    <div>
                      <span className="text-sm font-medium">Concise</span>
                      <p className="text-xs text-muted-foreground">Quick answers</p>
                    </div>
                    {aiDetail === "concise" && <Check className="h-4 w-4 ml-auto" />}
                  </Label>
                  <Label
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors flex-1 ${
                      aiDetail === "detailed" 
                        ? "border-foreground bg-foreground/5" 
                        : "border-border hover:border-foreground/50"
                    }`}
                  >
                    <RadioGroupItem value="detailed" className="sr-only" />
                    <div>
                      <span className="text-sm font-medium">Detailed</span>
                      <p className="text-xs text-muted-foreground">Comprehensive analysis</p>
                    </div>
                    {aiDetail === "detailed" && <Check className="h-4 w-4 ml-auto" />}
                  </Label>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Language & Timezone */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Language & Region
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
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
                  <Label className="text-sm text-muted-foreground">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="America/New_York">New York (EST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Los Angeles (PST)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                      <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} size="lg">
              Save Preferences
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkspacePreferences;
