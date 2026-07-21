import { useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { X, FileCode, FolderOpen, Plus, Save } from "lucide-react";
import { useStore } from "../store/useStore";

export function Editor() {
  const {
    openFiles,
    activeFilePath,
    setActiveFilePath,
    closeFile,
    updateActiveFileContent,
    saveActiveFile,
    setCursorPos,
    openWorkspaceFolder,
    createNewFile,
    repoPath
  } = useStore();

  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  // Keyboard shortcut Ctrl+S / Cmd+S for saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveActiveFile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveActiveFile]);

  const handleNewUntitledFile = () => {
    if (repoPath) {
      createNewFile(repoPath, `untitled-${Date.now().toString().slice(-4)}.ts`);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background select-none">
      {/* Top Tab Bar */}
      <div className="flex items-center bg-card border-b border-border h-9 overflow-x-auto select-none">
        {openFiles.map((file) => {
          const isActive = file.path === activeFilePath;
          const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";

          return (
            <div
              key={file.path}
              onClick={() => setActiveFilePath(file.path)}
              className={`px-3 py-1.5 h-full text-xs flex items-center gap-2 border-r border-border cursor-pointer transition-colors group max-w-[200px] flex-shrink-0 ${
                isActive
                  ? "bg-background border-t-2 border-t-accent font-semibold text-primary"
                  : "bg-card hover:bg-hover text-secondary hover:text-primary"
              }`}
            >
              <span className="text-[10px] font-bold text-accent px-1 py-0.2 rounded bg-hover">
                {ext}
              </span>
              <span className="truncate">{file.name}</span>

              {/* Dirty Unsaved Dot */}
              {file.isDirty && (
                <div className="w-2 h-2 rounded-full bg-warning flex-shrink-0" title="Unsaved changes" />
              )}

              {/* Close Tab Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.path);
                }}
                className="p-0.5 rounded hover:bg-hover text-muted hover:text-primary opacity-60 group-hover:opacity-100 transition-opacity ml-1"
                title="Close file"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        {/* Add Tab Button */}
        {repoPath && (
          <button
            onClick={handleNewUntitledFile}
            className="px-2 py-1.5 text-muted hover:text-primary hover:bg-hover h-full flex items-center justify-center transition-colors"
            title="New File"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Main Code Editor Panel */}
      <div className="flex-1 overflow-hidden relative">
        {activeFile ? (
          <CodeMirror
            value={activeFile.content}
            height="100%"
            theme={vscodeDark}
            onChange={(val) => updateActiveFileContent(val)}
            onStatistics={(stats) => {
              if (stats?.selection) {
                const head = stats.selection.main.head;
                // Calculate rough line & column from head position
                const textBefore = activeFile.content.slice(0, head);
                const lines = textBefore.split("\n");
                const line = lines.length;
                const col = lines[lines.length - 1].length + 1;
                setCursorPos({ line, col });
              }
            }}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightSpecialChars: true,
              history: true,
              foldGutter: true,
              drawSelection: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              syntaxHighlighting: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: true,
              crosshairCursor: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              closeBracketsKeymap: true,
              defaultKeymap: true,
              searchKeymap: true,
              historyKeymap: true,
              foldKeymap: true,
              completionKeymap: true,
              lintKeymap: true,
            }}
            className="h-full text-sm font-code"
          />
        ) : (
          /* Empty Workspace / No Tabs Screen */
          <div className="h-full w-full flex flex-col items-center justify-center p-8 space-y-6 text-center text-xs">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-xl shadow-accent/10">
              <FileCode size={32} />
            </div>

            <div className="space-y-1 max-w-sm">
              <h2 className="text-base font-bold text-primary">AXON Code Editor</h2>
              <p className="text-secondary">Select a file from the explorer or open a workspace folder to begin coding.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => openWorkspaceFolder()}
                className="px-4 py-2 rounded-lg bg-accent text-white font-semibold flex items-center gap-2 hover:bg-opacity-80 transition-opacity"
              >
                <FolderOpen size={14} />
                <span>Open Folder</span>
              </button>

              {activeFile && (
                <button
                  onClick={() => saveActiveFile()}
                  className="px-4 py-2 rounded-lg border border-border bg-card text-primary font-semibold flex items-center gap-2 hover:bg-hover transition-colors"
                >
                  <Save size={14} />
                  <span>Save File (Ctrl+S)</span>
                </button>
              )}
            </div>

            <div className="pt-8 border-t border-border/50 grid grid-cols-2 gap-4 text-[11px] text-muted text-left">
              <div><span className="font-semibold text-secondary">Ctrl + S</span> Save File</div>
              <div><span className="font-semibold text-secondary">Ctrl + P</span> File Search</div>
              <div><span className="font-semibold text-secondary">Ctrl + `</span> Toggle Terminal</div>
              <div><span className="font-semibold text-secondary">Ctrl + B</span> Toggle Sidebar</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
