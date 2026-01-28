import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface RequestFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureTitle: string;
  featureDescription: string;
  onSubmit: (message: string) => Promise<void>;
  isSubmitting: boolean;
}

export function RequestFeatureDialog({
  open,
  onOpenChange,
  featureTitle,
  featureDescription,
  onSubmit,
  isSubmitting,
}: RequestFeatureDialogProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    await onSubmit(message);
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request Feature: {featureTitle}</DialogTitle>
          <DialogDescription>{featureDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Additional Context (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Any additional information about why you need this feature..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] bg-background"
              disabled={isSubmitting}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            We'll review your request and respond within 24-48 hours. You can
            also reach us at{" "}
            <a
              href="mailto:contact@mcleuker.com"
              className="text-primary hover:underline"
            >
              contact@mcleuker.com
            </a>
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
