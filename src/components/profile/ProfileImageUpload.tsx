import { useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileImageUploadProps {
  currentImage: string | null;
  name: string | null;
  onImageSelect: (base64Image: string) => void;
  disabled?: boolean;
}

export function ProfileImageUpload({
  currentImage,
  name,
  onImageSelect,
  disabled = false,
}: ProfileImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const validateAndProcessFile = useCallback(
    (file: File) => {
      setError(null);

      // Validate file type
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setError("Only JPG and PNG files are accepted");
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }

      // Create image element to crop to square
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          // Create canvas for square crop
          const canvas = document.createElement("canvas");
          const size = Math.min(img.width, img.height);
          const offsetX = (img.width - size) / 2;
          const offsetY = (img.height - size) / 2;

          // Set canvas size (max 400px for performance)
          const outputSize = Math.min(size, 400);
          canvas.width = outputSize;
          canvas.height = outputSize;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(
              img,
              offsetX,
              offsetY,
              size,
              size,
              0,
              0,
              outputSize,
              outputSize
            );

            const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
            setPreviewUrl(croppedBase64);
            onImageSelect(croppedBase64);
          }
        };
        img.src = e.target?.result as string;
      };

      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        validateAndProcessFile(file);
      }
    },
    [disabled, validateAndProcessFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        validateAndProcessFile(file);
      }
    },
    [validateAndProcessFile]
  );

  const clearPreview = useCallback(() => {
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const displayImage = previewUrl || currentImage;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative group",
          disabled && "opacity-50 pointer-events-none"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={cn(
            "relative w-28 h-28 rounded-full border-2 transition-all",
            isDragging
              ? "border-dashed border-foreground bg-accent"
              : "border-border",
            !disabled && "cursor-pointer"
          )}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Avatar className="h-full w-full">
            <AvatarImage src={displayImage || undefined} />
            <AvatarFallback className="text-2xl bg-muted text-foreground">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>

          {/* Hover Overlay */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/70 transition-opacity",
              isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            {isDragging ? (
              <Upload className="h-6 w-6 text-white" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
            <span className="text-xs text-white mt-1">
              {isDragging ? "Drop here" : "Change"}
            </span>
          </div>
        </div>

        {/* Clear Preview Button */}
        {previewUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearPreview();
            }}
            className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground">
        Drag & drop or click to upload. JPG, PNG (max 5MB)
      </p>

      {/* Error Message */}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Preview indicator */}
      {previewUrl && (
        <p className="text-xs text-muted-foreground italic">
          New image selected — save to apply
        </p>
      )}
    </div>
  );
}
