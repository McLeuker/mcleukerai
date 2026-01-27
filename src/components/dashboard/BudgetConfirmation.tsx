import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Bot, Clock, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface BudgetConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimatedCost: { min: number; max: number };
  userBalance: number;
  maxAllowed: number;
  profileName: string;
  onConfirm: (maxBudget: number) => void;
  onCancel: () => void;
}

export function BudgetConfirmation({
  open,
  onOpenChange,
  estimatedCost,
  userBalance,
  maxAllowed,
  profileName,
  onConfirm,
  onCancel,
}: BudgetConfirmationProps) {
  const [selectedBudget, setSelectedBudget] = useState(maxAllowed);
  
  const hasEnoughCredits = userBalance >= estimatedCost.min;
  const effectiveMax = Math.min(maxAllowed, userBalance);

  const handleConfirm = () => {
    onConfirm(selectedBudget);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Confirm Agent Research
          </DialogTitle>
          <DialogDescription>
            This research will be handled by an autonomous AI agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Agent Profile */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Agent Mode</span>
            <Badge variant="secondary" className="gap-1">
              <Bot className="h-3 w-3" />
              {profileName}
            </Badge>
          </div>

          {/* Time Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700">This may take time</p>
              <p className="text-amber-600/80">
                Deep research tasks typically run 5-30 minutes. You can close this tab - 
                results will be saved to your conversation.
              </p>
            </div>
          </div>

          {/* Credit Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your Balance</span>
              <span className="font-medium">{userBalance} credits</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated Cost</span>
              <span className="font-medium">
                {estimatedCost.min} - {estimatedCost.max} credits
              </span>
            </div>
          </div>

          {/* Budget Slider */}
          {hasEnoughCredits && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Maximum Budget</span>
                <span className="text-sm font-bold text-primary">
                  {selectedBudget} credits
                </span>
              </div>
              <Slider
                value={[selectedBudget]}
                onValueChange={(val) => setSelectedBudget(val[0])}
                min={estimatedCost.min}
                max={effectiveMax}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Research will stop automatically when this limit is reached.
              </p>
            </div>
          )}

          {/* Insufficient Credits Warning */}
          {!hasEnoughCredits && (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Insufficient Credits</p>
                <p className="text-destructive/80">
                  You need at least {estimatedCost.min} credits. Your balance: {userBalance}.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!hasEnoughCredits}
            className={cn(
              "gap-2",
              hasEnoughCredits && "bg-primary"
            )}
          >
            <Coins className="h-4 w-4" />
            Start Research
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
