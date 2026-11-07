"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface AuthState {
  error?: string;
}

export async function loginAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message || "Invalid email or password." };
  }

  // Determine role: check user metadata first, then profiles table
  let role = data.user.user_metadata?.role;

  if (!role) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    role = profile?.role;
  }

  if (role === "client") {
    redirect("/portal");
  } else {
    redirect("/requisitions");
  }
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

