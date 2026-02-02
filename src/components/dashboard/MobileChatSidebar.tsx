import { Conversation } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Plus, Menu, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
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

interface MobileChatSidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
}

export function MobileChatSidebar({
  conversations,
  currentConversation,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: MobileChatSidebarProps) {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  const handleSelect = (conv: Conversation) => {
    onSelectConversation(conv);
    setOpen(false);
  };

  const handleNew = () => {
    onNewConversation();
    setOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
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

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
                  <span className="text-background font-semibold text-xs">M</span>
                </div>
                <span className="text-sm">McLeuker AI</span>
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="p-4">
            <Button
              onClick={handleNew}
              variant="default"
              className="w-full gap-2 justify-center h-10"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>

          <div className="px-4 pb-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Chat History ({conversations.length})
            </p>
          </div>

          <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
            <div className="px-2 pb-4 space-y-1">
              {conversations.length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No chats yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelect(conv)}
                    className={cn(
                      "group relative w-full text-left px-3 py-3 rounded-lg transition-all duration-200",
                      "border border-transparent",
                      "hover:bg-sidebar-accent hover:border-sidebar-border",
                      currentConversation?.id === conv.id &&
                        "bg-sidebar-accent border-sidebar-border"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0 pr-8">
                        <p className="text-xs font-medium text-sidebar-foreground line-clamp-2 leading-relaxed">
                          {conv.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {formatDistanceToNow(conv.updatedAt || new Date(conv.updated_at || Date.now()), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={(e) => handleDeleteClick(e, conv.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat and all its messages.
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
