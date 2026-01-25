import { ChatMessage, Conversation } from "@/hooks/useConversations";
import type { Source } from "@/components/dashboard/SourceCitations";

// Generate filename with chat title and date
function generateFilename(conversation: Conversation | null, extension: string): string {
  const title = conversation?.title || "McLeuker-Research";
  const sanitizedTitle = title
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
  const date = new Date().toISOString().split("T")[0];
  return `${sanitizedTitle}_${date}.${extension}`;
}

// Helper to extract sources from messages
function extractSources(messages: ChatMessage[]): Source[] {
  const allSources: Source[] = [];
  messages.forEach(msg => {
    if (msg.sources && Array.isArray(msg.sources)) {
      allSources.push(...msg.sources);
    }
  });
  return allSources;
}

// Export chat to PDF (using browser print with enhanced styling)
export function exportToPDF(
  conversation: Conversation | null,
  messages: ChatMessage[],
  sources?: Source[]
): void {
  const title = conversation?.title || "McLeuker AI Research Report";
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Extract sources from messages if not provided
  const allSources = sources || extractSources(messages);

  const content = messages
    .map((msg) => {
      const role = msg.role === "user" ? "You" : "McLeuker AI";
      const time = new Date(msg.created_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const model = msg.model_used ? ` (${msg.model_used})` : "";
      const credits = msg.credits_used > 0 ? ` | ${msg.credits_used} credits` : "";
      
      // Convert markdown-style tables to HTML tables
      let formattedContent = msg.content
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/^### (.*?)$/gm, "<h3 style='margin-top: 16px; margin-bottom: 8px; font-size: 16px; font-weight: 600;'>$1</h3>")
        .replace(/^## (.*?)$/gm, "<h2 style='margin-top: 20px; margin-bottom: 12px; font-size: 18px; font-weight: 600;'>$1</h2>")
        .replace(/^# (.*?)$/gm, "<h1 style='margin-top: 24px; margin-bottom: 16px; font-size: 22px; font-weight: 700;'>$1</h1>")
        .replace(/^- (.*?)$/gm, "<li style='margin-left: 20px;'>$1</li>")
        .replace(/\n/g, "<br>");

      return `
        <div style="margin-bottom: 28px; padding: 20px; background: ${
          msg.role === "user" ? "#ffffff" : "#f8f9fa"
        }; border-radius: 12px; border: 1px solid #e9ecef;">
          <div style="font-size: 12px; color: #666; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <strong style="color: #333;">${role}</strong>${model}${credits}
            <span style="color: #999;">·</span>
            <span>${time}</span>
            ${msg.is_favorite ? '<span style="color: #fbbf24;">⭐</span>' : ""}
          </div>
          <div style="white-space: pre-wrap; line-height: 1.7; font-size: 14px; color: #1a1a1a;">
            ${formattedContent}
          </div>
        </div>
      `;
    })
    .join("");

  // Build sources section
  let sourcesHtml = "";
  if (allSources.length > 0) {
    sourcesHtml = `
      <div style="margin-top: 40px; padding-top: 24px; border-top: 2px solid #e9ecef;">
        <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Sources & Citations</h2>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${allSources.map((source, idx) => `
            <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #3b82f6;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="background: #3b82f6; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600;">${idx + 1}</span>
                <span style="font-weight: 500; font-size: 13px;">${source.title || "Source"}</span>
              </div>
              <a href="${source.url}" style="font-size: 12px; color: #3b82f6; text-decoration: none;">${source.url}</a>
              ${source.snippet ? `<p style="font-size: 12px; color: #666; margin-top: 8px;">${source.snippet.slice(0, 150)}...</p>` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 48px;
          color: #1a1a1a;
          background: white;
        }
        h1 { font-size: 28px; margin-bottom: 8px; font-weight: 700; }
        .date { color: #666; font-size: 14px; margin-bottom: 8px; }
        .meta { color: #999; font-size: 12px; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #e9ecef; }
        @media print {
          body { padding: 24px; }
          @page { margin: 1in; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="date">${date}</div>
      <div class="meta">Generated by McLeuker AI • ${messages.length} messages • ${allSources.length} sources</div>
      ${content}
      ${sourcesHtml}
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

// Export chat to Excel/CSV with enhanced data
export function exportToExcel(
  conversation: Conversation | null,
  messages: ChatMessage[],
  sources?: Source[]
): void {
  // Messages sheet
  const headers = ["Timestamp", "Role", "Message", "Model", "Credits", "Favorite", "Research Type"];
  
  const rows = messages.map((msg) => [
    new Date(msg.created_at).toISOString(),
    msg.role === "user" ? "You" : "McLeuker AI",
    `"${msg.content.replace(/"/g, '""').replace(/\n/g, " ")}"`,
    msg.model_used || "",
    msg.credits_used.toString(),
    msg.is_favorite ? "Yes" : "No",
    msg.isResearched ? "Deep Research" : "Quick Answer",
  ]);

  let csvContent = [
    "# McLeuker AI Research Export",
    `# Generated: ${new Date().toISOString()}`,
    `# Chat: ${conversation?.title || "Untitled"}`,
    "",
    "## Messages",
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  // Add sources section if available
  const allSources = sources || extractSources(messages);
  if (allSources.length > 0) {
    const sourceHeaders = ["Citation #", "Title", "URL", "Type", "Relevance", "Snippet"];
    const sourceRows = allSources.map((source, idx) => [
      (idx + 1).toString(),
      `"${(source.title || "").replace(/"/g, '""')}"`,
      source.url,
      source.type,
      source.relevance_score?.toFixed(2) || "",
      `"${(source.snippet || "").replace(/"/g, '""').slice(0, 100)}"`,
    ]);

    csvContent += "\n\n## Sources & Citations\n";
    csvContent += sourceHeaders.join(",") + "\n";
    csvContent += sourceRows.map((row) => row.join(",")).join("\n");
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = generateFilename(conversation, "csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export to Word-compatible format (HTML that Word can open)
export function exportToWord(
  conversation: Conversation | null,
  messages: ChatMessage[],
  sources?: Source[]
): void {
  const title = conversation?.title || "McLeuker AI Research Report";
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const allSources = sources || extractSources(messages);

  const content = messages
    .map((msg) => {
      const role = msg.role === "user" ? "You" : "McLeuker AI";
      const time = new Date(msg.created_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      
      // Convert markdown to basic formatting
      let formattedContent = msg.content
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\*(.*?)\*/g, "<i>$1</i>")
        .replace(/^### (.*?)$/gm, "<h3>$1</h3>")
        .replace(/^## (.*?)$/gm, "<h2>$1</h2>")
        .replace(/^# (.*?)$/gm, "<h1>$1</h1>")
        .replace(/\n/g, "<br>");

      return `
        <div style="margin-bottom: 20px; padding: 15px; background-color: ${msg.role === "user" ? "#fff" : "#f5f5f5"}; border: 1px solid #ddd;">
          <p style="font-size: 11px; color: #666;"><b>${role}</b> · ${time}</p>
          <div style="font-size: 12px; line-height: 1.6;">${formattedContent}</div>
        </div>
      `;
    })
    .join("");

  let sourcesHtml = "";
  if (allSources.length > 0) {
    sourcesHtml = `
      <h2>Sources & Citations</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <tr style="background-color: #f0f0f0;">
          <th>#</th>
          <th>Title</th>
          <th>URL</th>
          <th>Type</th>
        </tr>
        ${allSources.map((source, idx) => `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td>${source.title || "Source"}</td>
            <td><a href="${source.url}">${source.url}</a></td>
            <td>${source.type}</td>
          </tr>
        `).join("")}
      </table>
    `;
  }

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>90</w:Zoom>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Calibri', sans-serif; font-size: 11pt; }
        h1 { font-size: 24pt; color: #333; }
        h2 { font-size: 16pt; color: #333; margin-top: 20px; }
        h3 { font-size: 13pt; color: #333; }
        table { font-size: 10pt; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p style="color: #666;">${date} · ${messages.length} messages</p>
      <hr>
      ${content}
      ${sourcesHtml}
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = generateFilename(conversation, "doc");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export structured research report (for tables and data)
export function exportResearchReport(
  conversation: Conversation | null,
  messages: ChatMessage[],
  format: "pdf" | "excel" | "word" = "pdf"
): void {
  const sources = extractSources(messages);
  
  switch (format) {
    case "pdf":
      exportToPDF(conversation, messages, sources);
      break;
    case "excel":
      exportToExcel(conversation, messages, sources);
      break;
    case "word":
      exportToWord(conversation, messages, sources);
      break;
  }
}

// Export selected messages only
export function exportSelectedToPDF(
  conversation: Conversation | null,
  messages: ChatMessage[],
  selectedIds: string[]
): void {
  const selectedMessages = messages.filter((m) => selectedIds.includes(m.id));
  exportToPDF(conversation, selectedMessages);
}

export function exportSelectedToExcel(
  conversation: Conversation | null,
  messages: ChatMessage[],
  selectedIds: string[]
): void {
  const selectedMessages = messages.filter((m) => selectedIds.includes(m.id));
  exportToExcel(conversation, selectedMessages);
}

// Export favorites only
export function exportFavoritesToPDF(
  conversation: Conversation | null,
  messages: ChatMessage[]
): void {
  const favoriteMessages = messages.filter((m) => m.is_favorite);
  exportToPDF(conversation, favoriteMessages);
}

export function exportFavoritesToExcel(
  conversation: Conversation | null,
  messages: ChatMessage[]
): void {
  const favoriteMessages = messages.filter((m) => m.is_favorite);
  exportToExcel(conversation, favoriteMessages);
}
