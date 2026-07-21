import { useState, useEffect } from "react";
import { FolderPlus } from "lucide-react";
import { useStore } from "../store/useStore";

export function DropOverlay() {
  const [isDragging, setIsDragging] = useState(false);
  const { openWorkspaceFolder } = useStore();

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.clientX === 0 || e.clientY === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        // @ts-ignore
        const path = file.path || file.name;
        if (path) {
          openWorkspaceFolder(path);
        }
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [openWorkspaceFolder]);

  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center border-4 border-dashed border-accent m-4 rounded-xl pointer-events-none">
      <FolderPlus size={64} className="text-accent animate-bounce mb-4" />
      <h2 className="text-2xl font-bold text-primary mb-1">Drop folder to open</h2>
      <p className="text-sm text-secondary">Open this directory as your active AXON workspace</p>
    </div>
  );
}
