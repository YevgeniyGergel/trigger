"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginPsychologist, type LoginState } from "./actions";
import { Logo } from "@/components/ui/logo";
import { RippleBackdrop } from "@/components/ui/ripple";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginPsychologist, initialState);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <RippleBackdrop />
      <div className="relative w-full max-w-sm">
        <div className="flex justify-center">
          <Logo href={null} size="lg" />
        </div>
        <Card className="mt-8 shadow-lifted">
          <CardBody className="p-8">
            <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
              З поверненням
            </h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              Увійдіть у свій простір практики.
            </p>
            <form action={formAction} className="mt-6 space-y-5">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Вхід..." : "Увійти"}
              </Button>
            </form>
          </CardBody>
        </Card>
        <p className="mt-6 text-center text-sm text-ink-muted">
          Ще немає акаунту?{" "}
          <Link
            href="/register"
            className="font-medium text-sage-700 underline decoration-sage-300 underline-offset-2 hover:decoration-sage-600"
          >
            Зареєструватися
          </Link>
        </p>
      </div>
    </div>
  );
}
