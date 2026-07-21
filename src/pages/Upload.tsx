import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, File, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { ExtractedData } from "../types";

type FileStatus = "pending" | "processing" | "done" | "error";

interface QueuedFile {
  file: File;
  status: FileStatus;
  error?: string;
}

export interface BatchResult {
  fileName: string;
  extractedData: ExtractedData | null;
  error: string | null;
}

export default function Upload() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const addFiles = (incoming: FileList | File[]) => {
    const newFiles = Array.from(incoming).map((file) => ({
      file,
      status: "pending" as FileStatus,
    }));
    // Skip exact duplicates already queued (same name + size)
    setQueue((prev) => {
      const existingKeys = new Set(prev.map((q) => `${q.file.name}-${q.file.size}`));
      const deduped = newFiles.filter((q) => !existingKeys.has(`${q.file.name}-${q.file.size}`));
      return [...prev, ...deduped];
    });
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Allow re-selecting the same file(s) later
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStatus = (index: number, status: FileStatus, error?: string) => {
    setQueue((prev) =>
      prev.map((q, i) => (i === index ? { ...q, status, error } : q))
    );
  };

  const handleProcessAll = async () => {
    if (queue.length === 0) return;

    setIsProcessing(true);
    const results: BatchResult[] = [];

    for (let i = 0; i < queue.length; i++) {
      setCurrentIndex(i);
      updateStatus(i, "processing");

      const formData = new FormData();
      formData.append("document", queue[i].file);

      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to process document");
        }

        const extractedData = await response.json();
        results.push({ fileName: queue[i].file.name, extractedData, error: null });
        updateStatus(i, "done");
      } catch (err: any) {
        const message = err.message || "An error occurred during processing.";
        results.push({ fileName: queue[i].file.name, extractedData: null, error: message });
        updateStatus(i, "error");
      }
    }

    setCurrentIndex(null);
    setIsProcessing(false);
    navigate("/batch-review", { state: { results } });
  };

  const doneCount = queue.filter((q) => q.status === "done").length;
  const errorCount = queue.filter((q) => q.status === "error").length;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Upload Documents</h1>
        <p className="text-gray-500 mt-1">
          Upload one or more receipts, invoices, or statements for OCR extraction.
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
          isDragging
            ? "border-indigo-500 bg-indigo-50"
            : "border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className="flex flex-col items-center justify-center space-y-4 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-indigo-600">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">Click or drag documents here</p>
            <p className="text-sm text-gray-500 mt-1">
              Supports PDF, JPG, PNG up to 10MB each — select multiple files at once
            </p>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          multiple
          onChange={handleFileChange}
        />
      </div>

      {queue.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 px-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              {queue.length} document{queue.length !== 1 ? "s" : ""} queued
            </h2>
            {isProcessing && (
              <p className="text-xs text-gray-500">
                Processing {currentIndex !== null ? currentIndex + 1 : 0} of {queue.length}
              </p>
            )}
          </div>

          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {queue.map((q, idx) => (
              <div key={`${q.file.name}-${q.file.size}-${idx}`} className="flex items-center gap-3 px-6 py-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <File className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{q.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(q.file.size / 1024 / 1024).toFixed(2)} MB
                    {q.status === "error" && q.error ? ` — ${q.error}` : ""}
                  </p>
                </div>

                {q.status === "pending" && !isProcessing && (
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                    aria-label={`Remove ${q.file.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {q.status === "processing" && (
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin flex-shrink-0" />
                )}
                {q.status === "done" && (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                )}
                {q.status === "error" && (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="p-4 px-6 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {isProcessing
                ? `${doneCount} done${errorCount > 0 ? `, ${errorCount} failed` : ""}`
                : "Ready to process"}
            </p>
            <button
              onClick={handleProcessAll}
              disabled={isProcessing || queue.length === 0}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing OCR...
                </>
              ) : (
                `Process ${queue.length} Document${queue.length !== 1 ? "s" : ""}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
