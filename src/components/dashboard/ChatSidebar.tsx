import { Conversation } from "@/hooks/useConversations";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Search,
  X,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversationId: string) => void;
}

export function ChatSidebar({
  conversations,
  currentConversation,
  isOpen,
  onToggle,
  onSelectConversation,
  onDeleteConversation,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteClick = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete);
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  // Collapsed state - positioned below unified top bar
  if (!isOpen) {
    return (
      <aside className="hidden lg:flex w-14 border-r border-border bg-sidebar flex-col fixed left-0 top-[120px] bottom-0 z-40">
        <div className="p-2 pt-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10"
            onClick={onToggle}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="hidden lg:flex w-72 border-r border-border bg-sidebar flex-col fixed left-0 top-[120px] bottom-0 z-40">
        {/* Breathing room spacer */}
        <div className="h-4" />
        
        {/* Header with collapse toggle */}
        <div className="px-4 pt-4 pb-4 flex items-center justify-between border-b border-sidebar-border">
          <span className="font-medium text-sm text-sidebar-foreground">Chat History</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onToggle}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Search - bubble style */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-10 text-sm bg-muted border-0 rounded-full placeholder:text-muted-foreground/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Chat count */}
        <div className="px-4 pb-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {filteredConversations.length} {filteredConversations.length === 1 ? 'chat' : 'chats'}
          </p>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="px-2 pb-4 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="px-2 py-8 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No matching chats" : "No chats yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery ? "Try a different search" : "Start a new chat to begin"}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative w-full text-left px-4 py-3 rounded-full transition-all duration-200",
                    "bg-muted text-foreground",
                    "hover:bg-muted/80",
                    currentConversation?.id === conv.id &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-sidebar"
                  )}
                >
                  <button
                    onClick={() => onSelectConversation(conv)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="h-4 w-4 text-foreground/60 flex-shrink-0" />
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">
                          {conv.title}
                        </p>
                        <p className="text-[10px] text-foreground/60 mt-1.5">
                          {formatDistanceToNow(new Date(conv.updated_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-foreground hover:text-foreground hover:bg-foreground/10"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteClick(conv.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat and all its messages. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
