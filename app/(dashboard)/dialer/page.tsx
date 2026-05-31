import { DialerForm } from "@/components/dashboard/DialerForm";

export default function DialerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-dc-navy">Dialer</h1>
        <p className="text-muted-foreground">
          Place outbound calls through the AI agent.
        </p>
      </div>
      <DialerForm />
    </div>
  );
}
