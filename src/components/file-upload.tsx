"use client";

import { useState, useCallback, ChangeEvent, DragEvent, MouseEvent } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface FileUploadProps {
  onFileSelect: (file: File | null, additionalFiles: File[]) => void;
  loading: boolean;
  buttonText: string;
}

export function FileUpload({ onFileSelect, loading, buttonText }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFileChange = useCallback((selectedFile: File | null) => {
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        alert("Please upload an image file (PNG, JPG, etc).");
        return;
      }
      setFile(selectedFile);
      const previewUrl = URL.createObjectURL(selectedFile);
      setPreview(previewUrl);
    } else {
      setFile(null);
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }
    }
  }, [preview]);

  const handleAdditionalFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith("image/"));
      const totalFiles = [...additionalFiles, ...newFiles].slice(0, 3); // Max 3
      setAdditionalFiles(totalFiles);

      // Update previews
      const newPreviews = totalFiles.map(f => URL.createObjectURL(f));
      // Revoke old
      additionalPreviews.forEach(p => URL.revokeObjectURL(p));
      setAdditionalPreviews(newPreviews);
    }
  };

  const removeAdditionalFile = (index: number) => {
    const newFiles = [...additionalFiles];
    newFiles.splice(index, 1);
    setAdditionalFiles(newFiles);

    const newPreviews = [...additionalPreviews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setAdditionalPreviews(newPreviews);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files ? e.target.files[0] : null);
  };

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files ? e.dataTransfer.files[0] : null);
  }, [handleFileChange]);

  const onPaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const pastedFile = item.getAsFile();
          if (pastedFile) {
            handleFileChange(pastedFile);
            return;
          }
        }
        if (item.type === "text/plain") {
          item.getAsString((text) => {
            if (text.startsWith("data:image/")) {
              fetch(text).then(r => r.blob()).then(b => {
                const ext = b.type.split("/")[1] || "png";
                const f = new File([b], `pasted-${Date.now()}.${ext}`, { type: b.type });
                handleFileChange(f);
              }).catch(() => {
                console.warn("Failed to process pasted data URI");
              });
            }
          });
        }
      }
    }
  }, [handleFileChange]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      additionalPreviews.forEach(p => URL.revokeObjectURL(p));
    };
  }, [preview, additionalPreviews]);

  useEffect(() => {
    if (dropRef.current) {
      dropRef.current.focus();
    }
  }, []);

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const clearFile = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handleFileChange(null);
    setAdditionalFiles([]);
    setAdditionalPreviews([]);
  };

  const handleSubmit = () => {
    onFileSelect(file, additionalFiles);
  };

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
        )}
        tabIndex={0}
        role="button"
        aria-label="Upload image by dropping, pasting, or clicking to browse"
        ref={dropRef}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onPaste={onPaste}
      >
        {preview ? (
          <>
            <div className="relative w-full max-w-md h-64 rounded-lg overflow-hidden">
              <Image
                src={preview}
                alt="Image preview"
                fill
                className="object-contain"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-background/50 hover:bg-background rounded-full h-8 w-8 z-50"
              onClick={clearFile}
              aria-label="Remove image"
            >
              <X className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <>
            <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="mb-2 text-lg font-semibold text-center">
              Drag & drop or paste a screenshot here
            </p>
            <p className="text-sm text-muted-foreground">or click to browse (Ctrl+V to paste)</p>
          </>
        )}
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={onInputChange}
          accept="image/png, image/jpeg"
          disabled={loading}
        />
      </div>

      {/* Additional Files Section (Only if primary exists) */}
      {file && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground">Style References (Optional, Max 3)</label>
            <span className="text-xs text-muted-foreground">{additionalFiles.length}/3</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {additionalPreviews.map((src, i) => (
              <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden border border-border shrink-0 group">
                <Image src={src} alt={`Ref ${i}`} fill className="object-cover" />
                <button
                  onClick={() => removeAdditionalFile(i)}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {additionalFiles.length < 3 && (
              <label className="relative w-20 h-20 flex flex-col items-center justify-center border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors shrink-0">
                <UploadCloud className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-1">Add Ref</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleAdditionalFilesChange}
                />
              </label>
            )}
          </div>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={loading || !file} className="w-full md:w-auto">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {buttonText}
      </Button>
    </div>
  );
}
