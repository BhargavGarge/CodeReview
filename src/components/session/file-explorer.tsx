"use client";

import { useState, useCallback } from "react";
import { FileText, Trash2 } from "lucide-react";

interface FileListItem {
  id: string;
  file_name: string;
  created_at: string;
  updated_at: string;
}

interface FileExplorerProps {
  sessionId: string;
  files: FileListItem[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onFileDeleted: (fileId: string) => void;
  isOwner: boolean;
}

export function FileExplorer({
  sessionId,
  files,
  activeFileId,
  onSelectFile,
  onFileDeleted,
  isOwner,
}: FileExplorerProps) {
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  const handleDeleteFile = useCallback(
    async (fileId: string) => {
      if (!confirm("Delete this file?")) return;

      setLoadingFileId(fileId);
      try {
        const res = await fetch(`/api/sessions/${sessionId}/files/${fileId}`, {
          method: "DELETE",
        });

        if (!res.ok) throw new Error("Failed to delete file");

        onFileDeleted(fileId);
      } catch (err) {
        console.error("Error deleting file:", err);
        alert("Failed to delete file");
      } finally {
        setLoadingFileId(null);
      }
    },
    [sessionId, onFileDeleted],
  );

  return (
    <div className="flex h-full flex-col border-r border-slate-800/80 bg-slate-950/50">
      {/* Header */}
      <div className="border-b border-slate-800/80 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-200">Files</h3>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2">
        {files.map((file) => (
          <div
            key={file.id}
            className={`group flex items-center justify-between gap-2 rounded px-2 py-1 text-xs transition ${
              activeFileId === file.id
                ? "bg-slate-700 text-slate-100"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-300"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectFile(file.id)}
              className="flex flex-1 items-center gap-2 truncate"
            >
              <FileText className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{file.file_name}</span>
            </button>

            {isOwner && (
              <button
                type="button"
                onClick={() => void handleDeleteFile(file.id)}
                disabled={loadingFileId === file.id}
                className="rounded p-0.5 text-slate-400 transition hover:bg-red-900/30 hover:text-red-400 disabled:opacity-50"
                title="Delete file"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {files.length === 0 && (
          <div className="p-2 text-center text-xs text-slate-500">
            No files yet.
          </div>
        )}
      </div>
    </div>
  );
}
