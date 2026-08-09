import React, { useState } from "react";
import { Sparkles, ArrowRight, ShieldAlert } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

export function SignupScreen({ onGoToLogin }: { onGoToLogin: () => void }) {
  const { signup } = useAuthStore();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(username.trim(), password, displayName.trim() || username.trim());
    } catch (err: any) {
      setError(err.message || "Failed to create profile.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-primary font-ui items-center justify-center relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-3xl"></div>
        <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="z-10 w-full max-w-sm bg-card border border-border p-8 rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4 text-accent border border-accent/20 shadow-[0_0_15px_rgba(var(--accent),0.2)]">
            <Sparkles size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Create Profile</h1>
          <p className="text-muted text-sm mt-1 text-center">Set up a local account for AXON IDE</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted ml-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all"
              placeholder="e.g. kavya"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted ml-1">Display Name (Optional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all"
              placeholder="e.g. Kavya"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all"
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted ml-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-2.5 bg-error/10 border border-error/20 rounded-lg text-error text-xs font-medium">
              {error}
            </div>
          )}

          <div className="p-3 bg-secondary rounded-lg border border-border flex items-start gap-2">
            <ShieldAlert size={16} className="text-muted flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted leading-tight">
              This protects local access to AXON on this device. There is no password recovery if you forget it.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username || !password || !confirmPassword}
            className="w-full bg-accent text-white py-2.5 rounded-lg text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? "Creating..." : "Create Profile"}
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-border pt-4">
          <p className="text-sm text-muted">
            Already have a profile?{" "}
            <button onClick={onGoToLogin} className="text-accent font-medium hover:underline focus:outline-none">
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
