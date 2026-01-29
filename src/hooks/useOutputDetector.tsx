export type FileExportType = "excel" | "csv" | "pdf" | "docx" | "pptx";

export interface ExportRecommendation {
  type: FileExportType;
  confidence: number;
  reason: string;
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export interface ParsedCodeBlock {
  language: string;
  content: string;
}

export interface ParsedContent {
  tables: ParsedTable[];
  codeBlocks: ParsedCodeBlock[];
  lists: string[][];
  headings: { level: number; text: string }[];
  paragraphs: string[];
  wordCount: number;
}

export function useOutputDetector() {
  // Parse markdown content to extract structured data
  const parseMarkdownContent = (content: string): ParsedContent => {
    const tables: ParsedTable[] = [];
    const codeBlocks: ParsedCodeBlock[] = [];
    const lists: string[][] = [];
    const headings: { level: number; text: string }[] = [];
    const paragraphs: string[] = [];

    const lines = content.split("\n");
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Parse code blocks
      const codeMatch = line.match(/^```(\w*)/);
      if (codeMatch) {
        const language = codeMatch[1] || "text";
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        codeBlocks.push({ language, content: codeLines.join("\n") });
        i++;
        continue;
      }

      // Parse tables
      if (line.includes("|") && line.trim().startsWith("|")) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].includes("|")) {
          tableLines.push(lines[i]);
          i++;
        }
        const table = parseTable(tableLines);
        if (table) tables.push(table);
        continue;
      }

      // Parse headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        headings.push({
          level: headingMatch[1].length,
          text: headingMatch[2].trim(),
        });
        i++;
        continue;
      }

      // Parse lists
      if (line.match(/^[\s]*[-*+]\s+/) || line.match(/^[\s]*\d+\.\s+/)) {
        const listItems: string[] = [];
        while (
          i < lines.length &&
          (lines[i].match(/^[\s]*[-*+]\s+/) || lines[i].match(/^[\s]*\d+\.\s+/))
        ) {
          const itemText = lines[i].replace(/^[\s]*[-*+\d.]+\s+/, "").trim();
          listItems.push(itemText);
          i++;
        }
        if (listItems.length > 0) lists.push(listItems);
        continue;
      }

      // Parse paragraphs
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("|")) {
        paragraphs.push(trimmed);
      }

      i++;
    }

    const wordCount = content.split(/\s+/).filter(Boolean).length;

    return { tables, codeBlocks, lists, headings, paragraphs, wordCount };
  };

  // Parse markdown table
  const parseTable = (lines: string[]): ParsedTable | null => {
    if (lines.length < 2) return null;

    // Filter out separator rows (---|---|---)
    const dataLines = lines.filter(
      (line) => !line.replace(/\|/g, "").match(/^[\s-:]+$/)
    );

    if (dataLines.length < 1) return null;

    const headers = dataLines[0]
      .split("|")
      .filter(Boolean)
      .map((h) => h.trim());

    const rows = dataLines.slice(1).map((line) =>
      line
        .split("|")
        .filter(Boolean)
        .map((cell) => cell.trim())
    );

    return { headers, rows };
  };

  // Analyze content and recommend export formats
  const analyzeContent = (content: string): ExportRecommendation[] => {
    const parsed = parseMarkdownContent(content);
    const recommendations: ExportRecommendation[] = [];

    // Tables suggest Excel/CSV
    if (parsed.tables.length > 0) {
      const totalRows = parsed.tables.reduce((sum, t) => sum + t.rows.length, 0);
      if (totalRows >= 5) {
        recommendations.push({
          type: "excel",
          confidence: 0.9,
          reason: `Contains ${parsed.tables.length} table(s) with ${totalRows} rows`,
        });
      } else {
        recommendations.push({
          type: "csv",
          confidence: 0.7,
          reason: `Contains small table with ${totalRows} rows`,
        });
      }
    }

    // Long content suggests PDF/Word
    if (parsed.wordCount > 300 || parsed.headings.length >= 3) {
      recommendations.push({
        type: "pdf",
        confidence: 0.8,
        reason: "Long-form content suitable for document export",
      });
      recommendations.push({
        type: "docx",
        confidence: 0.75,
        reason: "Editable document format",
      });
    }

    // Multiple sections/headings suggest PowerPoint
    if (parsed.headings.length >= 4 && parsed.lists.length >= 2) {
      recommendations.push({
        type: "pptx",
        confidence: 0.7,
        reason: "Multiple sections suitable for presentation",
      });
    }

    // Sort by confidence
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  };

  // Convert parsed content to Excel data
  const convertToExcelData = (
    parsed: ParsedContent
  ): { name: string; columns: string[]; rows: (string | number)[][] }[] => {
    const sheets: { name: string; columns: string[]; rows: (string | number)[][] }[] = [];

    // Convert tables
    parsed.tables.forEach((table, index) => {
      sheets.push({
        name: `Table ${index + 1}`,
        columns: table.headers,
        rows: table.rows.map((row) =>
          row.map((cell) => {
            const num = parseFloat(cell.replace(/[,$%]/g, ""));
            return isNaN(num) ? cell : num;
          })
        ),
      });
    });

    // Convert lists to a sheet if no tables
    if (sheets.length === 0 && parsed.lists.length > 0) {
      const allItems = parsed.lists.flat();
      sheets.push({
        name: "List Data",
        columns: ["Item"],
        rows: allItems.map((item) => [item]),
      });
    }

    return sheets;
  };

  // Convert parsed content to document sections
  const convertToDocumentSections = (
    parsed: ParsedContent
  ): { title: string; content: string; type?: string }[] => {
    const sections: { title: string; content: string; type?: string }[] = [];

    // Group content by headings
    let currentSection: { title: string; content: string[]; type?: string } | null = null;

    const lines = parsed.paragraphs;
    const allContent = parsed.headings
      .map((h) => ({ type: "heading", level: h.level, text: h.text }))
      .concat(
        parsed.paragraphs.map((p) => ({ type: "paragraph", level: 0, text: p }))
      );

    // Simple approach: create sections from headings
    for (const heading of parsed.headings) {
      if (heading.level <= 2) {
        if (currentSection && currentSection.content.length > 0) {
          sections.push({
            title: currentSection.title,
            content: currentSection.content.join("\n\n"),
            type: "paragraph",
          });
        }
        currentSection = { title: heading.text, content: [], type: "heading" };
      } else if (currentSection) {
        currentSection.content.push(`### ${heading.text}`);
      }
    }

    // Add remaining content
    if (currentSection && currentSection.content.length > 0) {
      sections.push({
        title: currentSection.title,
        content: currentSection.content.join("\n\n"),
        type: "paragraph",
      });
    }

    // If no sections created, use full content
    if (sections.length === 0) {
      sections.push({
        title: "Content",
        content: parsed.paragraphs.join("\n\n"),
        type: "paragraph",
      });
    }

    return sections;
  };

  // Convert parsed content to slides
  const convertToSlides = (
    parsed: ParsedContent
  ): { title: string; content: string[]; type?: string }[] => {
    const slides: { title: string; content: string[]; type?: string }[] = [];

    // Title slide
    const mainHeading = parsed.headings.find((h) => h.level === 1);
    slides.push({
      title: mainHeading?.text || "Presentation",
      content: [],
      type: "title",
    });

    // Content slides from H2 headings
    for (const heading of parsed.headings.filter((h) => h.level === 2)) {
      // Find related list items or create from paragraphs
      const relatedList = parsed.lists[0] || [];
      slides.push({
        title: heading.text,
        content: relatedList.slice(0, 5), // Max 5 bullet points per slide
        type: "bullets",
      });
    }

    // If no slides created, create basic content slides
    if (slides.length === 1) {
      const chunks = parsed.paragraphs.reduce<string[][]>((acc, p, i) => {
        const chunkIndex = Math.floor(i / 3);
        if (!acc[chunkIndex]) acc[chunkIndex] = [];
        acc[chunkIndex].push(p);
        return acc;
      }, []);

      chunks.forEach((chunk, i) => {
        slides.push({
          title: `Slide ${i + 2}`,
          content: chunk,
          type: "content",
        });
      });
    }

    return slides;
  };

  return {
    parseMarkdownContent,
    analyzeContent,
    convertToExcelData,
    convertToDocumentSections,
    convertToSlides,
  };
}
