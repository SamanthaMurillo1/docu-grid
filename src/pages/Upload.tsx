import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, File, X, Loader2 } from "lucide-react";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("document", file);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process document");
      }

      const extractedData = await response.json();
      
      // Store in location state and navigate to review
      navigate("/review", { 
        state: { 
          extractedData, 
          fileName: file.name 
        } 
      });
    } catch (err: any) {
      setError(err.message || "An error occurred during upload.");
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Upload Document</h1>
        <p className="text-gray-500 mt-1">Upload a receipt, invoice, or statement for OCR extraction.</p>
      </div>

      <div 
        className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
          isDragging 
            ? "border-indigo-500 bg-indigo-50" 
            : file 
              ? "border-gray-300 bg-white" 
              : "border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!file ? (
          <div className="flex flex-col items-center justify-center space-y-4 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-indigo-600">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">Click or drag document here</p>
              <p className="text-sm text-gray-500 mt-1">Supports PDF, JPG, PNG up to 10MB</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <File className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setFile(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing OCR...
                  </>
                ) : (
                  "Process Document"
                )}
              </button>
            </div>
          </div>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
