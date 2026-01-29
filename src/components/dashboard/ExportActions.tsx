import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFileGeneration } from "@/hooks/useFileGeneration";
import { useOutputDetector, ExportRecommendation, ParsedContent } from "@/hooks/useOutputDetector";
import { cn } from "@/lib/utils";
import {
  FileSpreadsheet,
  FileText,
  Presentation,
  Play,
  Loader2,
  ChevronDown,
  File,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { GeneratedFile } from "./FileDownloadCard";

interface ExportActionsProps {
  content: string;
  onFileGenerated?: (file: GeneratedFile) => void;
  onCodeRun?: (code: string, language: string) => void;
  className?: string;
}

const exportIcons = {
  excel: FileSpreadsheet,
  csv: FileSpreadsheet,
  pdf: FileText,
  docx: FileText,
  pptx: Presentation,
};

const exportLabels = {
  excel: "Excel",
  csv: "CSV",
  pdf: "PDF",
  docx: "Word",
  pptx: "PowerPoint",
};

export function ExportActions({
  content,
  onFileGenerated,
  onCodeRun,
  className,
}: ExportActionsProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const { generateFile, generating } = useFileGeneration();
  const { analyzeContent, parseMarkdownContent, convertToExcelData, convertToDocumentSections, convertToSlides } = useOutputDetector();

  const parsed = parseMarkdownContent(content);
  const recommendations = analyzeContent(content);

  // Don't show if no recommendations
  if (recommendations.length === 0 && parsed.codeBlocks.length === 0) {
    return null;
  }

  const primaryRecommendation = recommendations[0];
  const hasCode = parsed.codeBlocks.length > 0;
  const runnableCode = parsed.codeBlocks.find(
    (block) => block.language === "javascript" || block.language === "typescript" || block.language === "js" || block.language === "ts"
  );

  const handleExport = async (type: "excel" | "csv" | "pdf" | "docx" | "pptx") => {
    setExporting(type);

    try {
      let request: Parameters<typeof generateFile>[0];
      const timestamp = new Date().toISOString().split("T")[0];

      switch (type) {
        case "excel":
        case "csv":
          const excelData = convertToExcelData(parsed);
          request = {
            output_type: type,
            filename: `export_${timestamp}`,
            sheets: excelData,
          };
          break;

        case "pdf":
        case "docx":
          const sections = convertToDocumentSections(parsed);
          request = {
            output_type: type,
            filename: `document_${timestamp}`,
            sections,
          };
          break;

        case "pptx":
          const slides = convertToSlides(parsed);
          request = {
            output_type: type,
            filename: `presentation_${timestamp}`,
            slides,
          };
          break;
      }

      const file = await generateFile(request);
      if (file && onFileGenerated) {
        onFileGenerated(file);
      }
    } finally {
      setExporting(null);
    }
  };

  const handleRunCode = () => {
    if (runnableCode && onCodeRun) {
      onCodeRun(runnableCode.content, runnableCode.language);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 pt-4 border-t border-border mt-4",
        className
      )}
    >
      {/* Primary action */}
      {primaryRecommendation && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport(primaryRecommendation.type)}
          disabled={generating || exporting !== null}
          className="h-8"
        >
          {exporting === primaryRecommendation.type ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <>
              {(() => {
                const Icon = exportIcons[primaryRecommendation.type];
                return <Icon className="h-4 w-4 mr-2" />;
              })()}
            </>
          )}
          Export as {exportLabels[primaryRecommendation.type]}
          {primaryRecommendation.confidence >= 0.8 && (
            <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
              Recommended
            </Badge>
          )}
        </Button>
      )}

      {/* More export options */}
      {recommendations.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              disabled={generating || exporting !== null}
            >
              <File className="h-4 w-4 mr-1" />
              More
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {recommendations.slice(1).map((rec) => {
              const Icon = exportIcons[rec.type];
              return (
                <DropdownMenuItem
                  key={rec.type}
                  onClick={() => handleExport(rec.type)}
                  disabled={exporting !== null}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {exportLabels[rec.type]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Run code button */}
      {runnableCode && onCodeRun && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunCode}
          className="h-8 ml-auto"
        >
          <Play className="h-4 w-4 mr-2" />
          Run Code
        </Button>
      )}

      {/* Detection badges */}
      <div className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground">
        {parsed.tables.length > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {parsed.tables.length} table{parsed.tables.length > 1 ? "s" : ""}
          </Badge>
        )}
        {parsed.codeBlocks.length > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {parsed.codeBlocks.length} code block{parsed.codeBlocks.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>
    </div>
  );
}
