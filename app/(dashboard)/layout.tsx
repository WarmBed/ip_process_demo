import Navbar from "@/components/navbar";
import AgentPanel from "@/components/agent-panel";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Top navbar */}
      <Navbar />

      {/* Body: Agent (left) + Content (right) */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <AgentPanel />
        <main style={{ flex: 1, overflowY: "auto", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
