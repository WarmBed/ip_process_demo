import Navbar from "@/components/navbar";
import AgentPanel from "@/components/agent-panel";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Navbar />
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <main style={{ height: "100%", overflowY: "auto", background: "var(--color-background)", display: "flex", flexDirection: "column" }}>
          {children}
        </main>
        <AgentPanel />
      </div>
    </div>
  );
}
