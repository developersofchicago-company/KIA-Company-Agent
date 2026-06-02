import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Credentials come from CLI args or env vars — never hardcode them.
//   npx tsx scripts/create-user.ts <email> <password> [full name]
const email = process.argv[2] ?? process.env.SEED_USER_EMAIL;
const password = process.argv[3] ?? process.env.SEED_USER_PASSWORD;
const fullName = process.argv[4] ?? process.env.SEED_USER_NAME ?? "Admin";

async function main() {
  if (!email || !password) {
    console.error(
      "Usage: npx tsx scripts/create-user.ts <email> <password> [full name]\n" +
        "   or set SEED_USER_EMAIL / SEED_USER_PASSWORD env vars.",
    );
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "Admin" },
  });

  if (error) {
    console.error("Error creating user:", error.message);
    process.exit(1);
  }
  console.log("✓ User created:", data.user?.email);
}

main();
