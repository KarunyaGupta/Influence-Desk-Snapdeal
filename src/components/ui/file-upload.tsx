"use client";

import * as React from "react";
import { Upload, File, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface FileUploadFile {
  file: File;
  progress: number; // 0-100
}

export interface FileUploadProps {
  value?: FileUploadFile | null;
  onChange?: (file: FileUploadFile | null) => void;
  accept?: string;
  maxSizeMb?: number;
  error?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  value,
  onChange,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSizeMb = 10,
  error,
  id,
  disabled,
  className,
}: FileUploadProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const errorId = error && id ? `${id}-error` : undefined;

  function handleFile(file: File) {
    if (file.size > maxSizeMb * 1024 * 1024) {
      return; // silently reject oversized files — caller can add validation
    }
    // Simulate upload progress
    const uploadFile: FileUploadFile = { file, progress: 0 };
    onChange?.(uploadFile);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      onChange?.({ file, progress: Math.min(progress, 100) });
    }, 200);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  if (value?.file) {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex items-center gap-3 rounded-md border border-input bg-background p-3">
          <File className="h-8 w-8 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {value.file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(value.file.size)}
            </p>
            {value.progress < 100 && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${value.progress}%` }}
                />
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              aria-label="Replace file"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange?.(null)}
              disabled={disabled}
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        id={id}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={cn(
          "flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-background p-4 text-center transition-colors hover:border-primary/50 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          dragOver && "border-primary bg-accent/50",
          error && "border-destructive",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">
            Drop file here or click to browse
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {accept.replace(/\./g, "").toUpperCase()} up to {maxSizeMb}MB
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
