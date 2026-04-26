"use client";

import { useState, useCallback } from "react";
import { FileText, FolderPlus, Trash2, Plus } from "lucide-react";

interface FileItem {
  id: string;
  file_name: string;
  created_at: string;
  updated_at: string;
}

interface FileExplorerProps {
  sessionId: string;
  files: FileItem[];
  activeFileId: string | null;
  onSelectFile: (fileId: string, fileName: string) => void;
  onFileCreated: (file: FileItem) => void;
  onFileDeleted: (fileId: string) => void;
  isOwner: boolean;
}

export function FileExplorer({
  sessionId,
  files,
  activeFileId,
  onSelectFile,
  onFileCreated,
  onFileDeleted,
  isOwner,
}: FileExplorerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  const handleCreateFile = useCallback(async () => {
    if (!newFileName.trim()) return;

    setLoadingFileId("new");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: newFileName.trim(),
          content: "",
        }),
      });

      if (!res.ok) throw new Error("Failed to create file");

      const { file } = (await res.json()) as { file: FileItem };
      onFileCreated(file);
      setNewFileName("");
      setIsCreating(false);
      onSelectFile(file.id, file.file_name);
    } catch (err) {
      console.error("Error creating file:", err);
      alert("Failed to create file");
    } finally {
      setLoadingFileId(null);
    }
  }, [newFileName, sessionId, onFileCreated, onSelectFile]);

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
          {isOwner && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              title="New file"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2">
        {isCreating && (
          <div className="rounded bg-slate-800/50 p-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="file.js"
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-slate-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateFile();
                if (e.key === "Escape") setIsCreating(false);
              }}
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void handleCreateFile()}
                disabled={loadingFileId === "new" || !newFileName.trim()}
                className="flex-1 rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-600 disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

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
              onClick={() => onSelectFile(file.id, file.file_name)}
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

        {files.length === 0 && !isCreating && (
          <div className="p-2 text-center text-xs text-slate-500">
            No files yet.
            {isOwner && " Click + to create one."}
          </div>
        )}
      </div>
    </div>
  );
}
