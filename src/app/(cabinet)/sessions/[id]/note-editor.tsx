"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  updateEditedTranscript,
  updateSoapText,
  retryTranscription,
  retrySoap,
  type NoteActionState,
} from "./note-actions";

const NOTE_STATUS_BADGES: Record<string, { label: string; tone: "neutral" | "warning" | "danger" | "success" }> = {
  RECORDING: { label: "запис", tone: "neutral" },
  TRANSCRIBING: { label: "транскрибується…", tone: "warning" },
  READY: { label: "готово", tone: "success" },
  FAILED: { label: "помилка транскрипції", tone: "danger" },
};

const SOAP_STATUS_BADGES: Record<string, { label: string; tone: "neutral" | "warning" | "danger" | "success" }> = {
  NONE: { label: "без SOAP", tone: "neutral" },
  DRAFT: { label: "чернетка, потребує перегляду", tone: "warning" },
  REVIEWED: { label: "перевірено", tone: "success" },
  FAILED: { label: "помилка SOAP-структурування", tone: "danger" },
};

export function NoteEditor({
  sessionId,
  audioSignedUrl,
  noteStatus,
  soapStatus,
  transcriptText,
  editedText,
  soapText,
}: {
  sessionId: string;
  audioSignedUrl: string | null;
  noteStatus: string;
  soapStatus: string;
  transcriptText: string | null;
  editedText: string | null;
  soapText: string | null;
}) {
  const updateTranscriptWithId = updateEditedTranscript.bind(null, sessionId);
  const updateSoapWithId = updateSoapText.bind(null, sessionId);

  const [transcriptState, transcriptAction, isSavingTranscript] = useActionState<
    NoteActionState,
    FormData
  >(updateTranscriptWithId, {});
  const [soapState, soapAction, isSavingSoap] = useActionState<NoteActionState, FormData>(
    updateSoapWithId,
    {}
  );

  const [transcriptDraft, setTranscriptDraft] = useState(editedText ?? transcriptText ?? "");
  const [soapDraft, setSoapDraft] = useState(soapText ?? "");
  const [isRetrying, startRetry] = useTransition();

  const noteBadge = NOTE_STATUS_BADGES[noteStatus];
  const soapBadge = SOAP_STATUS_BADGES[soapStatus];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={noteBadge?.tone ?? "neutral"}>{noteBadge?.label ?? noteStatus}</Badge>
        <Badge tone={soapBadge?.tone ?? "neutral"}>{soapBadge?.label ?? soapStatus}</Badge>
      </div>

      {audioSignedUrl && (
        <audio controls src={audioSignedUrl} className="w-full">
          Ваш браузер не підтримує відтворення аудіо.
        </audio>
      )}

      {noteStatus === "FAILED" && (
        <div>
          <Alert tone="danger">Транскрипція не вдалась.</Alert>
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            disabled={isRetrying}
            onClick={() =>
              startRetry(async () => {
                await retryTranscription(sessionId);
              })
            }
          >
            Спробувати ще раз
          </Button>
        </div>
      )}

      {(noteStatus === "READY" || transcriptText) && (
        <form action={transcriptAction}>
          <Label htmlFor="editedText">Транскрипт</Label>
          <Textarea
            id="editedText"
            name="editedText"
            rows={8}
            value={transcriptDraft}
            onChange={(e) => setTranscriptDraft(e.target.value)}
          />
          {transcriptState.error && (
            <Alert tone="danger" className="mt-2">
              {transcriptState.error}
            </Alert>
          )}
          <Button type="submit" variant="secondary" size="sm" className="mt-2" disabled={isSavingTranscript}>
            {isSavingTranscript ? "Збереження…" : "Зберегти транскрипт"}
          </Button>
        </form>
      )}

      {soapStatus === "FAILED" && (
        <div>
          <Alert tone="danger">SOAP-структурування не вдалось.</Alert>
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            disabled={isRetrying}
            onClick={() =>
              startRetry(async () => {
                await retrySoap(sessionId);
              })
            }
          >
            Спробувати ще раз
          </Button>
        </div>
      )}

      {(soapStatus === "DRAFT" || soapStatus === "REVIEWED") && (
        <form action={soapAction}>
          <Label htmlFor="soapText">SOAP-нотатка {soapStatus === "DRAFT" && "(чернетка — перевірте перед збереженням)"}</Label>
          <Textarea
            id="soapText"
            name="soapText"
            rows={12}
            value={soapDraft}
            onChange={(e) => setSoapDraft(e.target.value)}
          />
          {soapState.error && (
            <Alert tone="danger" className="mt-2">
              {soapState.error}
            </Alert>
          )}
          <Button type="submit" size="sm" className="mt-2" disabled={isSavingSoap}>
            {isSavingSoap ? "Збереження…" : "Підтвердити SOAP-нотатку"}
          </Button>
        </form>
      )}
    </div>
  );
}
