import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireCurrentPsychologist() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const psychologist = await prisma.psychologist.findUnique({
    where: { id: session.user.id },
  });

  if (!psychologist) {
    redirect("/login");
  }

  return psychologist;
}
