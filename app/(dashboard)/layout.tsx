import Navbar from "@/components/navbar";
import AgentPanel from "@/components/agent-panel";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Navbar />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div className="agent-panel-wrap"><AgentPanel /></div>
        <main style={{ flex: 1, overflowY: "auto", background: "var(--color-background)", display: "flex", flexDirection: "column" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
