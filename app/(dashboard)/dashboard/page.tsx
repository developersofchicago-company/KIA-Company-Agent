import { redirect } from "next/navigation";

// KIA demo: the full dashboard requires tables not present in this project.
// Redirect to the Client Files page, which is the active feature.
export default function DashboardPage() {
  redirect("/client-files");
}
