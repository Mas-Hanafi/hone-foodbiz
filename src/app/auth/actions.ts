"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { done, fail, parse, text } from "@/lib/form";

const credentials = z.object({
  email: z.email("email"),
  password: z.string().min(8, "password"),
});

export async function signIn(formData: FormData) {
  const input = parse(credentials, formData, "/login");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input);
  if (error) fail("/login", "login");
  redirect("/app");
}

export async function signUp(formData: FormData) {
  const input = parse(credentials.extend({ display_name: text() }), formData, "/signup");
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { display_name: input.display_name }, emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) fail("/signup", error.code === "user_already_exists" ? "emailTaken" : "generic");
  // With "Confirm email" off in Supabase, signUp returns a session right away.
  if (data.session) redirect("/onboarding");
  done("/login", "checkEmail");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
