"use client";

import * as React from "react";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck, UserCheck, Building2, AlertCircle } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white transition-colors"
    >
      {pending ? "Signing in..." : "Sign In"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState<AuthState | null, FormData>(
    loginAction,
    null
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#4F46E5]/10 text-[#4F46E5] mb-2">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">
            TalentLens
          </h1>
          <p className="text-sm text-[#64748B]">
            AI CV Screening & Client Shortlist Portal
          </p>
        </div>

        <Card className="border border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-[#0F172A]">
              Account Login
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Enter your credentials to access your recruiter or client portal
            </CardDescription>
          </CardHeader>

          <form action={formAction}>
            <CardContent className="space-y-4">
              {state?.error && (
                <div className="flex items-center gap-2 p-3 text-xs rounded-md bg-red-50 text-red-700 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{state.error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-[#0F172A]">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-xs font-medium text-[#0F172A]"
                  >
                    Password
                  </Label>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <SubmitButton />

              <div className="w-full border-t border-[#E5E7EB] pt-4">
                <p className="text-xs font-medium text-[#64748B] mb-2.5 text-center">
                  Quick Demo Accounts
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-normal justify-start gap-1.5 text-[#0F172A] hover:bg-[#FAFAFA]"
                    onClick={() => handleDemoFill("recruiter@companya.com")}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#4F46E5]" />
                    Recruiter
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-normal justify-start gap-1.5 text-[#0F172A] hover:bg-[#FAFAFA]"
                    onClick={() => handleDemoFill("client.acme@acmecorp.com")}
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    Client A (Acme)
                  </Button>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-[#64748B]">
          Fair & DPDP Act 2023 compliant screening architecture.
        </p>
      </div>
    </main>
  );
}

