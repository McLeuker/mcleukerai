import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Presentation, Loader2, Check, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GeneratedFile {
  name: string;
  type: "excel" | "csv" | "docx" | "pptx" | "pdf";
  url: string;
  size: number;
  path?: string;
  created_at?: string;
}

interface FileDownloadCardProps {
  file: GeneratedFile;
  className?: string;
}

const fileIcons: Record<string, typeof FileText> = {
  excel: FileSpreadsheet,
  csv: FileSpreadsheet,
  docx: FileText,
  pptx: Presentation,
  pdf: FileText,
};

const fileLabels = {
  excel: "Excel Spreadsheet",
  csv: "CSV File",
  docx: "Word Document",
  pptx: "PowerPoint",
  pdf: "PDF Document",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDownloadCard({ file, className }: FileDownloadCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const Icon = fileIcons[file.type] || FileText;
  const label = fileLabels[file.type] || "File";

  const handleDownload = async () => {
    setDownloading(true);
    
    try {
      // Fetch the file
      const response = await fetch(file.url);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group",
        className
      )}
    >
      {/* File icon */}
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-foreground" />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {label} • {formatFileSize(file.size)}
        </p>
      </div>

      {/* Download button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={downloading}
        className={cn(
          "h-8 px-3 transition-all",
          downloaded && "bg-success/10 border-success/20 text-success"
        )}
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : downloaded ? (
          <>
            <Check className="h-4 w-4 mr-1.5" />
            Done
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-1.5" />
            Download
          </>
        )}
      </Button>
    </div>
  );
}

interface FileDownloadListProps {
  files: GeneratedFile[];
  className?: string;
}

export function FileDownloadList({ files, className }: FileDownloadListProps) {
  if (!files || files.length === 0) return null;

  return (
    <div className={cn("mt-6 pt-6 border-t border-border", className)}>
      <p className="text-sm font-medium text-foreground mb-3">
        Generated Files
      </p>
      <div className="space-y-2">
        {files.map((file, index) => (
          <FileDownloadCard key={`${file.name}-${index}`} file={file} />
        ))}
      </div>
    </div>
  );
}
