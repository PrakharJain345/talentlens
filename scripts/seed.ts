import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Please configure them in .env.local before running seed.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface SeedUserConfig {
  email: string;
  role: "recruiter" | "client";
  fullName: string;
  clientOrgName?: string;
  password?: string;
}

const SEED_USERS: SeedUserConfig[] = [
  {
    email: "recruiter@companya.com",
    role: "recruiter",
    fullName: "Recruiter (Company A)",
    password: "password123",
  },
  {
    email: "client.acme@acmecorp.com",
    role: "client",
    fullName: "Acme Hiring Manager",
    clientOrgName: "Acme Corp",
    password: "password123",
  },
  {
    email: "client.beta@betaretail.com",
    role: "client",
    fullName: "Beta Retail Hiring Manager",
    clientOrgName: "Beta Retail",
    password: "password123",
  },
];

async function getOrCreateClientOrg(name: string): Promise<string> {
  const { data: existing, error: selectError } = await supabase
    .from("clients")
    .select("id, name")
    .eq("name", name)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to query client org "${name}": ${selectError.message}`);
  }

  if (existing) {
    console.log(`  ✓ Client org already exists: "${name}" (${existing.id})`);
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from("clients")
    .insert({ name })
    .select("id, name")
    .single();

  if (insertError) {
    throw new Error(`Failed to create client org "${name}": ${insertError.message}`);
  }

  console.log(`  + Created client org: "${name}" (${created.id})`);
  return created.id;
}

async function findAuthUserByEmail(email: string) {
  let page = 1;
  const perPage = 50;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (found) return found;

    if (data.users.length < perPage) break;
    page++;
  }

  return null;
}

async function seedUser(config: SeedUserConfig, clientId: string | null): Promise<string> {
  const password = config.password || "password123";
  const userMetadata = {
    role: config.role,
    full_name: config.fullName,
    client_id: clientId,
  };

  const existing = await findAuthUserByEmail(config.email);
  let userId: string;

  if (existing) {
    userId = existing.id;
    console.log(`  ✓ Auth user exists: ${config.email} (${userId})`);

    // Update metadata and ensure confirmed
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (updateError) {
      console.warn(`    ⚠️ Note updating auth metadata: ${updateError.message}`);
    }
  } else {
    // Create via auth.admin.createUser with user_metadata so handle_new_user trigger creates profile
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: config.email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (createError) {
      throw new Error(`Failed to create auth user ${config.email}: ${createError.message}`);
    }

    userId = data.user.id;
    console.log(`  + Created auth user (trigger syncs profile): ${config.email} (${userId})`);
  }

  // Idempotent safeguard: ensure public.profiles row exists with matching role & client_id
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      role: config.role,
      full_name: config.fullName,
      client_id: clientId,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.warn(`    ⚠️ Profile sync check: ${profileError.message}`);
  } else {
    console.log(`  ✓ Profile row confirmed: ${config.email} [role: ${config.role}]`);
  }

  return userId;
}

async function main() {
  console.log("=========================================================");
  console.log("🌱 TalentLens: Seeding Admin, Client Orgs & Auth Profiles");
  console.log("=========================================================");

  try {
    // 1. Client Organizations
    console.log("\n1. Ensuring Client Organizations exist in DB...");
    const orgMap = new Map<string, string>();
    orgMap.set("Acme Corp", await getOrCreateClientOrg("Acme Corp"));
    orgMap.set("Beta Retail", await getOrCreateClientOrg("Beta Retail"));

    // 2. Auth Users & Profiles
    console.log("\n2. Creating Auth Users with metadata (handle_new_user trigger)...");
    for (const seed of SEED_USERS) {
      const clientId = seed.clientOrgName ? orgMap.get(seed.clientOrgName) || null : null;
      await seedUser(seed, clientId);
    }

    console.log("\n=========================================================");
    console.log("✅ Seed completed successfully! (Idempotent)");
    console.log("Default credentials (Password: password123):");
    for (const u of SEED_USERS) {
      console.log(
        `  • ${u.email.padEnd(28)} -> Role: ${u.role.padEnd(10)} ${
          u.clientOrgName ? `[Org: ${u.clientOrgName}]` : "[Company A]"
        }`
      );
    }
    console.log("=========================================================\n");
  } catch (err: any) {
    console.error("\n❌ Seed script failed:", err.message || err);
    process.exit(1);
  }
}

main();
