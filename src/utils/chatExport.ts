import { ChatMessage, Conversation } from "@/hooks/useConversations";

// Generate filename with chat title and date
function generateFilename(conversation: Conversation | null, extension: string): string {
  const title = conversation?.title || "McLeuker-Chat";
  const sanitizedTitle = title
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
  const date = new Date().toISOString().split("T")[0];
  return `${sanitizedTitle}_${date}.${extension}`;
}

// Export chat to PDF (using browser print)
export function exportToPDF(
  conversation: Conversation | null,
  messages: ChatMessage[]
): void {
  const title = conversation?.title || "McLeuker AI Chat";
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const content = messages
    .map((msg) => {
      const role = msg.role === "user" ? "You" : "McLeuker AI";
      const time = new Date(msg.created_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const model = msg.model_used ? ` (${msg.model_used})` : "";
      return `
        <div style="margin-bottom: 24px; padding: 16px; background: ${
          msg.role === "user" ? "#ffffff" : "#f9f9f9"
        }; border-radius: 8px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            <strong>${role}</strong>${model} · ${time}
            ${msg.is_favorite ? " ⭐" : ""}
          </div>
          <div style="white-space: pre-wrap; line-height: 1.6;">
            ${msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </div>
        </div>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          color: #1a1a1a;
        }
        h1 { font-size: 24px; margin-bottom: 8px; }
        .date { color: #666; font-size: 14px; margin-bottom: 32px; }
        @media print {
          body { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="date">${date}</div>
      ${content}
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

// Export chat to Excel/CSV
export function exportToExcel(
  conversation: Conversation | null,
  messages: ChatMessage[]
): void {
  const headers = ["Timestamp", "Role", "Message", "Model", "Credits", "Favorite"];
  
  const rows = messages.map((msg) => [
    new Date(msg.created_at).toISOString(),
    msg.role === "user" ? "You" : "McLeuker AI",
    `"${msg.content.replace(/"/g, '""')}"`, // Escape quotes for CSV
    msg.model_used || "",
    msg.credits_used.toString(),
    msg.is_favorite ? "Yes" : "No",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

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
