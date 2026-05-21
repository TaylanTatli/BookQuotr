"use client";

import { useTranslation } from "@/i18n/client";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        toast.success(t("login.success"));
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || t("login.failed"));
      }
    } catch (error) {
      toast.error(t("login.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
          <CardHeader className="flex flex-col gap-3 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
              <Image src="/favicon.svg" alt="BookQuotr" width={40} height={40} className="text-primary" />
            </div>
            <div className="flex flex-col items-center gap-1 mx-auto">
              <CardTitle className="text-2xl font-bold">{t("login.title")}</CardTitle>
              <CardDescription className="text-sm text-balance">
                {t("login.subtitle")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="my-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">{t("login.username")}</FieldLabel>
                <FieldContent>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="password">{t("login.password")}</FieldLabel>
                <FieldContent>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="pt-4 mt-8">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {loading ? t("login.signingIn") : t("login.signIn")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
