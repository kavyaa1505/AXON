import { useEffect, useState } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { LoginScreen } from "./components/LoginScreen";
import { SignupScreen } from "./components/SignupScreen";
import { useAuthStore } from "./store/useAuthStore";
import { useTaskStore } from "./store/useTaskStore";
import { Sparkles } from "lucide-react";
import { Toast } from "./components/Toast";

function App() {
  const { currentUser, isInitializing, init, migrationToastVisible, hideMigrationToast } = useAuthStore();
  const [authScreen, setAuthScreen] = useState<"login" | "signup">("login");
  
  const [taskToast, setTaskToast] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const unsub = useTaskStore.subscribe((state, prevState) => {
      for (const id in state.tasks) {
        const task = state.tasks[id];
        const prevTask = prevState.tasks[id];
        if (prevTask && prevTask.status !== task.status && state.activeTaskId !== id) {
          if (task.status === "awaiting_review") {
            setTaskToast({ id, message: `${task.title} — ready for review` });
          } else if (task.status === "completed") {
            setTaskToast({ id, message: `${task.title} — completed` });
          } else if (task.status === "failed") {
            setTaskToast({ id, message: `${task.title} — failed` });
          }
        }
      }
    });
    return unsub;
  }, []);

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent animate-pulse">
            <Sparkles size={24} />
          </div>
          <p className="text-muted text-sm font-ui">Loading AXON IDE...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (authScreen === "login") {
      return <LoginScreen onGoToSignup={() => setAuthScreen("signup")} />;
    } else {
      return <SignupScreen onGoToLogin={() => setAuthScreen("login")} />;
    }
  }

  return (
    <>
      <MainLayout />
      {migrationToastVisible && (
        <Toast 
          message="Migrated your existing provider settings to your profile." 
          onClose={hideMigrationToast} 
        />
      )}
      {taskToast && (
        <div onClick={() => {
          useTaskStore.getState().setActiveTask(taskToast.id);
          setTaskToast(null);
        }} className="cursor-pointer">
          <Toast 
            message={taskToast.message} 
            onClose={() => setTaskToast(null)} 
          />
        </div>
      )}
    </>
  );
}

export default App;
