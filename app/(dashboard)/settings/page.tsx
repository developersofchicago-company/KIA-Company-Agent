import { CalendarSettings } from "@/components/settings/CalendarSettings";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { AgentSettings } from "@/components/settings/AgentSettings";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { Separator } from "@/components/ui/separator";
import { getDepartments } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const departments = await getDepartments();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-dc-navy">Settings</h1>
        <p className="text-muted-foreground">
          Manage your assistant, calendar, team, and integrations.
        </p>
      </div>

      <SystemSettings />

      <Separator />

      <AgentSettings />

      <Separator />

      <CalendarSettings departments={departments} />

      <Separator />

      <TeamSettings />
    </div>
  );
}
