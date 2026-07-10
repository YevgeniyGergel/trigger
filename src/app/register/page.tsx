"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerPsychologist, type RegisterState } from "./actions";
import { Logo } from "@/components/ui/logo";
import { RippleBackdrop } from "@/components/ui/ripple";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const initialState: RegisterState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerPsychologist, initialState);

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
              Створіть свій простір
            </h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              Кабінет для спокійної практики — за хвилину.
            </p>
            <form action={formAction} className="mt-6 space-y-5">
              <div>
                <Label htmlFor="name">Ім&apos;я</Label>
                <Input id="name" name="name" type="text" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                />
              </div>
              {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Реєстрація..." : "Зареєструватися"}
              </Button>
            </form>
          </CardBody>
        </Card>
        <p className="mt-6 text-center text-sm text-ink-muted">
          Вже маєте акаунт?{" "}
          <Link
            href="/login"
            className="font-medium text-sage-700 underline decoration-sage-300 underline-offset-2 hover:decoration-sage-600"
          >
            Увійти
          </Link>
        </p>
      </div>
    </div>
  );
}
