import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileCode,
  FileText,
  FileJson,
  FileImage,
  File
} from "lucide-react";
import { FileNode } from "../lib/fileService";
import { useStore } from "../store/useStore";

interface FileTreeProps {
  nodes: FileNode[];
  filter?: string;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

export function FileTree({ nodes, filter = "", onContextMenu }: FileTreeProps) {
  return (
    <div className="space-y-0.5 text-xs font-ui">
      {nodes.map((node) => (
        <FileTreeNode key={node.path} node={node} level={0} filter={filter} onContextMenu={onContextMenu} />
      ))}
    </div>
  );
}

interface TreeNodeProps {
  node: FileNode;
  level: number;
  filter: string;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

function FileTreeNode({ node, level, filter, onContextMenu }: TreeNodeProps) {
  const { openFile, activeFilePath } = useStore();
  const [isOpen, setIsOpen] = useState(level === 0 || filter.length > 0);

  const isMatchingFilter = !filter || node.name.toLowerCase().includes(filter.toLowerCase()) || 
    (node.children && node.children.some(c => c.name.toLowerCase().includes(filter.toLowerCase())));

  if (!isMatchingFilter) return null;

  const isActive = activeFilePath === node.path;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isDir) {
      setIsOpen(!isOpen);
    } else {
      openFile(node.path, node.name);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
        return <FileCode size={14} className="text-accent flex-shrink-0" />;
      case "js":
      case "jsx":
        return <FileCode size={14} className="text-warning flex-shrink-0" />;
      case "rs":
        return <FileCode size={14} className="text-orange-400 flex-shrink-0" />;
      case "json":
        return <FileJson size={14} className="text-success flex-shrink-0" />;
      case "css":
      case "scss":
        return <FileCode size={14} className="text-pink-400 flex-shrink-0" />;
      case "html":
        return <FileCode size={14} className="text-orange-500 flex-shrink-0" />;
      case "md":
        return <FileText size={14} className="text-secondary flex-shrink-0" />;
      case "png":
      case "jpg":
      case "svg":
        return <FileImage size={14} className="text-purple-400 flex-shrink-0" />;
      default:
        return <File size={14} className="text-muted flex-shrink-0" />;
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
        style={{ paddingLeft: `${level * 12 + 6}px` }}
        className={`flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer transition-colors group select-none ${
          isActive
            ? "bg-accent/20 text-accent font-semibold"
            : "hover:bg-hover text-secondary hover:text-primary"
        }`}
      >
        {node.isDir ? (
          <>
            <span className="text-muted group-hover:text-primary">
              {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
            {isOpen ? (
              <FolderOpen size={14} className="text-accent flex-shrink-0" />
            ) : (
              <Folder size={14} className="text-accent/80 flex-shrink-0" />
            )}
            <span className="truncate font-medium text-xs text-primary">{node.name}</span>
          </>
        ) : (
          <>
            <span className="w-3.5" />
            {getFileIcon(node.name)}
            <span className="truncate text-xs">{node.name}</span>
          </>
        )}
      </div>

      {node.isDir && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              filter={filter}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
