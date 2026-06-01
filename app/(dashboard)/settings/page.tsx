import { CalendarSettings } from "@/components/settings/CalendarSettings";
import { getDepartments } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const departments = await getDepartments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-dc-navy">Settings</h1>
        <p className="text-muted-foreground">
          Manage account, team, and integrations.
        </p>
      </div>

      <CalendarSettings departments={departments} />
    </div>
  );
}
