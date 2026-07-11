import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { getOwnedSession } from "@/lib/owned-session";
import { getSignedAudioUrl } from "@/lib/storage";
import { decryptNoteText } from "@/lib/crypto";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NoteRecorder } from "./note-recorder";
import { NoteEditor } from "./note-editor";
import { formatKyiv } from "@/lib/timezone";

const STATUS_BADGES: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" | "sage" }
> = {
  PENDING: { label: "очікує", tone: "warning" },
  CONFIRMED: { label: "підтверджено", tone: "sage" },
  CANCELLED: { label: "скасовано", tone: "danger" },
  COMPLETED: { label: "завершено", tone: "success" },
};

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const psychologist = await requireCurrentPsychologist();
  const session = await getOwnedSession(psychologist.id, id);

  if (!session) {
    notFound();
  }

  const status = STATUS_BADGES[session.status];
  const note = session.note;

  const audioSignedUrl = note?.audioUrl ? await getSignedAudioUrl(note.audioUrl) : null;
  const transcriptText = note?.transcriptTextEnc ? decryptNoteText(note.transcriptTextEnc) : null;
  const editedText = note?.editedTextEnc ? decryptNoteText(note.editedTextEnc) : null;
  const soapText = note?.soapTextEnc ? decryptNoteText(note.soapTextEnc) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Сесія"
        title={session.client.name}
        actions={
          <Link href={`/clients/${session.clientId}`} className="text-sm font-medium text-sage-700 hover:underline">
            До профілю клієнта
          </Link>
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Card className="h-fit p-5">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Дата й час</span>
              <span className="font-medium text-ink">
                {formatKyiv(session.startAt, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Статус</span>
              <Badge tone={status?.tone ?? "neutral"}>{status?.label ?? session.status}</Badge>
            </div>
          </div>
        </Card>

        <section>
          <h2 className="font-display text-lg text-ink">Нотатка сесії</h2>
          <div className="mt-4 space-y-6">
            {!note || note.status === "RECORDING" ? (
              <NoteRecorder sessionId={session.id} />
            ) : (
              <NoteEditor
                sessionId={session.id}
                audioSignedUrl={audioSignedUrl}
                noteStatus={note.status}
                soapStatus={note.soapStatus}
                transcriptText={transcriptText}
                editedText={editedText}
                soapText={soapText}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
