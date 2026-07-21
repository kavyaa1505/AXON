import { Group, Panel, Separator } from "react-resizable-panels";
import { Topbar } from "../Topbar";
import { Sidebar } from "../Sidebar";
import { Editor } from "../Editor";
import { Terminal } from "../Terminal";
import { AgentPanel } from "../AgentPanel";
import { SettingsDrawer } from "../SettingsDrawer";
import { StatusBar } from "../StatusBar";
import { WelcomeScreen } from "../WelcomeScreen";
import { DropOverlay } from "../DropOverlay";
import { useStore } from "../../store/useStore";

export function MainLayout() {
  const { sidebarOpen, terminalOpen, repoPath } = useStore();

  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden text-primary font-ui relative">
      <DropOverlay />
      <Topbar />

      <div className="flex-1 overflow-hidden">
        {!repoPath ? (
          <WelcomeScreen />
        ) : (
          <Group orientation="horizontal" id="axon-layout">
            {sidebarOpen && (
              <>
                <Panel defaultSize="15%" minSize="10%" maxSize="30%" className="bg-secondary border-r border-border">
                  <Sidebar />
                </Panel>
                <Separator className="w-1 bg-border hover:bg-accent transition-colors cursor-col-resize" />
              </>
            )}

            <Panel defaultSize="60%" minSize="30%">
              <Group orientation="vertical">
                <Panel defaultSize={terminalOpen ? "70%" : "100%"} className="bg-background">
                  <Editor />
                </Panel>

                {terminalOpen && (
                  <>
                    <Separator className="h-1 bg-border hover:bg-accent transition-colors cursor-row-resize" />
                    <Panel defaultSize="30%" minSize="15%" className="bg-card border-t border-border">
                      <Terminal />
                    </Panel>
                  </>
                )}
              </Group>
            </Panel>

            <Separator className="w-1 bg-border hover:bg-accent transition-colors cursor-col-resize" />

            <Panel defaultSize="25%" minSize="20%" className="bg-secondary border-l border-border relative">
              <div className="absolute inset-0 min-w-[380px] overflow-hidden">
                <AgentPanel />
              </div>
            </Panel>
          </Group>
        )}
      </div>

      <StatusBar />
      <SettingsDrawer />
    </div>
  );
}
