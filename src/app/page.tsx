import { TerminalShell } from "@/components/shell/TerminalShell";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <TerminalShell />
    </main>
  );
}
