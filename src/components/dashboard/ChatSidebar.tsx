/**
 * ChatSidebar.tsx - Premium Graphite Glass Panel
 * 
 * Features:
 * - Graphite glass background with gradient
 * - New Chat button between title and search
 * - Scrollable chat list
 * - Keyboard navigation support
 */

import { Conversation } from "@/hooks/useConversations";
import { useState, useRef, KeyboardEvent } from "react";
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
  Plus,
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
  onNewConversation?: () => void;
}

export function ChatSidebar({
  conversations,
  currentConversation,
  isOpen,
  onToggle,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

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

  const handleKeyDown = (e: KeyboardEvent, index: number, conversation: Conversation) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelectConversation(conversation);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (index < filteredConversations.length - 1) {
          setFocusedIndex(index + 1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          setFocusedIndex(index - 1);
        }
        break;
    }
  };

  // Collapsed state - graphite glass styling
  if (!isOpen) {
    return (
      <aside className={cn(
        "hidden lg:flex w-14 flex-col fixed left-0 top-14 bottom-0 z-40",
        "graphite-glass rounded-none"
      )}>
        <div className="p-2 pt-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 text-white/60 hover:text-white hover:bg-white/[0.08] focus:ring-2 focus:ring-white/20"
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
      <aside className={cn(
        "hidden lg:flex w-72 flex-col fixed left-0 top-[72px] bottom-0 z-40",
        "graphite-glass rounded-none",
        "h-[calc(100vh-72px)]"
      )}>
        {/* Header with collapse toggle */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between shrink-0">
          <span className="font-medium text-[13px] text-white/80">Chat History</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/[0.08] focus:ring-2 focus:ring-white/20"
            onClick={onToggle}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* New Chat Button - centered */}
        {onNewConversation && (
          <div className="px-4 pb-3 shrink-0">
            <Button
              onClick={onNewConversation}
              className={cn(
                "w-full justify-center gap-2",
                "bg-white text-black hover:bg-white/90",
                "h-10 rounded-full text-[13px] font-medium",
                "focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[#0A0A0A]"
              )}
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        )}

        {/* Search - premium input styling */}
        <div className="px-4 pb-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 pr-10 h-10 text-[13px]",
                "bg-white/[0.05] border-white/[0.08] rounded-full",
                "text-white placeholder:text-white/35",
                "focus:border-white/[0.15] focus:ring-1 focus:ring-white/[0.06]",
                "transition-all duration-160"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Chat count */}
        <div className="px-4 pb-2 shrink-0">
          <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
            {filteredConversations.length} {filteredConversations.length === 1 ? 'chat' : 'chats'}
          </p>
        </div>

        {/* Conversation List - scrollable */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 pb-4 space-y-2" ref={listRef}>
            {filteredConversations.length === 0 ? (
              <div className="px-2 py-8 text-center">
                <MessageSquare className="h-8 w-8 text-white/25 mx-auto mb-3" />
                <p className="text-[13px] text-white/50">
                  {searchQuery ? "No matching chats" : "No chats yet"}
                </p>
                <p className="text-[11px] text-white/35 mt-1">
                  {searchQuery ? "Try a different search" : "Start a new chat to begin"}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv, index) => (
                <div
                  key={conv.id}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => handleKeyDown(e, index, conv)}
                  className={cn(
                    "group relative w-full text-left px-4 py-3 rounded-xl min-h-fit",
                    "chat-sidebar-item premium-hover",
                    "focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-inset",
                    currentConversation?.id === conv.id && "chat-sidebar-item-active",
                    focusedIndex === index && "ring-2 ring-white/20 ring-inset"
                  )}
                >
                  <button
                    onClick={() => onSelectConversation(conv)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="h-4 w-4 text-white/50 flex-shrink-0" />
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-[12px] font-medium text-white/90 line-clamp-2 leading-relaxed">
                          {conv.title}
                        </p>
                        <p className="text-[10px] text-white/45 mt-1.5">
                          {formatDistanceToNow(conv.updatedAt, {
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
                        className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7",
                          "opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity",
                          "text-white/50 hover:text-white hover:bg-white/[0.1]"
                        )}
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