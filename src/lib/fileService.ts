export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

export const isTauri = (): boolean => {
  return typeof window !== "undefined" && Boolean((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__);
};

// Open folder dialog (Tauri dialog or File System Access API or prompt path)
export async function selectFolder(): Promise<string | null> {
  if (isTauri()) {
    try {
      // @ts-ignore
      const tauri = window.__TAURI__;
      if (tauri && tauri.dialog && tauri.dialog.open) {
        const selected = await tauri.dialog.open({ directory: true, multiple: false });
        if (selected) return Array.isArray(selected) ? selected[0] : selected;
      }
    } catch (e) {
      console.warn("Tauri dialog call error:", e);
    }
  }

  // Web File System Access API fallback
  if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
    try {
      const handle = await (window as any).showDirectoryPicker();
      if (handle && handle.name) {
        // Save handle reference globally for web fallback reading
        (window as any).__webDirectoryHandle__ = handle;
        return handle.name;
      }
    } catch (e: any) {
      if (e.name === "AbortError") return null;
      console.warn("Directory picker error:", e);
    }
  }

  // Final fallback prompt
  const manual = prompt("Enter workspace folder directory path:", "C:\\Users\\KAVYA\\my ide");
  return manual || null;
}

// Fetch recursive directory tree
export async function readDirTree(dirPath: string): Promise<FileNode[]> {
  if (isTauri()) {
    try {
      // @ts-ignore
      const tauri = window.__TAURI__;
      const invoke = tauri?.core?.invoke || tauri?.invoke;
      if (invoke) {
        return await invoke("read_dir_tree", { path: dirPath });
      }
    } catch (e) {
      console.error("Tauri read_dir_tree error:", e);
    }
  }

  // Browser directory handle fallback
  const handle = (window as any).__webDirectoryHandle__;
  if (handle && handle.name === dirPath) {
    return await readWebDirectoryHandle(handle);
  }

  // Return fallback tree if offline/demo
  return getFallbackTree(dirPath);
}

async function readWebDirectoryHandle(dirHandle: any, parentPath = dirHandle.name): Promise<FileNode[]> {
  const nodes: FileNode[] = [];
  try {
    for await (const entry of dirHandle.values()) {
      const entryPath = `${parentPath}/${entry.name}`;
      if (entry.kind === "directory") {
        if (["node_modules", ".git", "dist", "target", ".next"].includes(entry.name)) continue;
        const children = await readWebDirectoryHandle(entry, entryPath);
        nodes.push({ name: entry.name, path: entryPath, isDir: true, children });
      } else {
        nodes.push({ name: entry.name, path: entryPath, isDir: false });
      }
    }
  } catch (e) {
    console.error("Failed to read web directory handle", e);
  }

  return nodes.sort((a, b) => {
    if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
    return a.isDir ? -1 : 1;
  });
}

// Read file text content
export async function readFileContent(filePath: string): Promise<string> {
  if (isTauri()) {
    try {
      // @ts-ignore
      const tauri = window.__TAURI__;
      const invoke = tauri?.core?.invoke || tauri?.invoke;
      if (invoke) {
        return await invoke("read_file", { path: filePath });
      }
    } catch (e) {
      console.error("Tauri read_file error:", e);
    }
  }

  // Fallback demo content
  return getFallbackFileContent(filePath);
}

// Write file content to disk
export async function writeFileContent(filePath: string, content: string): Promise<void> {
  if (isTauri()) {
    try {
      // @ts-ignore
      const tauri = window.__TAURI__;
      const invoke = tauri?.core?.invoke || tauri?.invoke;
      if (invoke) {
        await invoke("write_file", { path: filePath, content });
        return;
      }
    } catch (e) {
      console.error("Tauri write_file error:", e);
    }
  }
}

// Create new file
export async function createFile(filePath: string): Promise<void> {
  if (isTauri()) {
    try {
      // @ts-ignore
      const tauri = window.__TAURI__;
      const invoke = tauri?.core?.invoke || tauri?.invoke;
      if (invoke) {
        await invoke("create_file", { path: filePath });
        return;
      }
    } catch (e) {
      console.error("Tauri create_file error:", e);
    }
  }
}

// Create new folder
export async function createFolder(folderPath: string): Promise<void> {
  if (isTauri()) {
    try {
      // @ts-ignore
      const tauri = window.__TAURI__;
      const invoke = tauri?.core?.invoke || tauri?.invoke;
      if (invoke) {
        await invoke("create_folder", { path: folderPath });
        return;
      }
    } catch (e) {
      console.error("Tauri create_folder error:", e);
    }
  }
}

// Delete item
export async function deleteItem(itemPath: string): Promise<void> {
  if (isTauri()) {
    try {
      // @ts-ignore
      const tauri = window.__TAURI__;
      const invoke = tauri?.core?.invoke || tauri?.invoke;
      if (invoke) {
        await invoke("delete_entry", { path: itemPath });
        return;
      }
    } catch (e) {
      console.error("Tauri delete_entry error:", e);
    }
  }
}

// Rename item
export async function renameItem(oldPath: string, newPath: string): Promise<void> {
  if (isTauri()) {
    try {
      // @ts-ignore
      const tauri = window.__TAURI__;
      const invoke = tauri?.core?.invoke || tauri?.invoke;
      if (invoke) {
        await invoke("rename_entry", { oldPath, newPath });
        return;
      }
    } catch (e) {
      console.error("Tauri rename_entry error:", e);
    }
  }
}

// Fallbacks for demo mode / web when filesystem is not directly connected
function getFallbackTree(dirPath: string): FileNode[] {
  return [
    {
      name: "src",
      path: `${dirPath}/src`,
      isDir: true,
      children: [
        { name: "App.tsx", path: `${dirPath}/src/App.tsx`, isDir: false },
        { name: "main.tsx", path: `${dirPath}/src/main.tsx`, isDir: false },
        { name: "index.css", path: `${dirPath}/src/index.css`, isDir: false },
        {
          name: "components",
          path: `${dirPath}/src/components`,
          isDir: true,
          children: [
            { name: "Topbar.tsx", path: `${dirPath}/src/components/Topbar.tsx`, isDir: false },
            { name: "Sidebar.tsx", path: `${dirPath}/src/components/Sidebar.tsx`, isDir: false },
            { name: "Editor.tsx", path: `${dirPath}/src/components/Editor.tsx`, isDir: false },
          ]
        }
      ]
    },
    { name: "package.json", path: `${dirPath}/package.json`, isDir: false },
    { name: "README.md", path: `${dirPath}/README.md`, isDir: false },
    { name: "tsconfig.json", path: `${dirPath}/tsconfig.json`, isDir: false }
  ];
}

function getFallbackFileContent(filePath: string): string {
  const fileName = filePath.split(/[/\\]/).pop() || "";
  if (fileName.endsWith(".tsx") || fileName.endsWith(".ts")) {
    return `// ${fileName}\nimport React from "react";\n\nexport function App() {\n  return (\n    <div className="p-4 bg-card text-primary">\n      <h1 className="font-bold">AXON IDE - ${fileName}</h1>\n    </div>\n  );\n}\n`;
  }
  if (fileName.endsWith(".json")) {
    return `{\n  "name": "axon-workspace",\n  "version": "1.0.0",\n  "private": true\n}\n`;
  }
  if (fileName.endsWith(".md")) {
    return `# AXON Workspace\n\nWelcome to your AI-native software development environment.\n`;
  }
  return `// ${fileName}\n// Created in AXON IDE\n`;
}
