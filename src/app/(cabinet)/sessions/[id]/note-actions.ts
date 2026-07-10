"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { getOwnedSession } from "@/lib/owned-session";
import { uploadAudioObject } from "@/lib/storage";
import { encryptNoteText, decryptNoteText } from "@/lib/crypto";
import { transcribeAudio } from "@/lib/transcription";
import { structureSoapNote } from "@/lib/soap";

export type NoteActionState = {
  error?: string;
};

async function getOwnedNoteBySessionId(psychologistId: string, sessionId: string) {
  const session = await getOwnedSession(psychologistId, sessionId);
  if (!session) return null;
  return session.note;
}

async function runTranscriptionAndSoap(noteId: string, audio: Buffer, contentType: string) {
  try {
    const transcriptText = await transcribeAudio(audio, `${noteId}.webm`, contentType);
    await prisma.sessionNote.update({
      where: { id: noteId },
      data: { transcriptTextEnc: encryptNoteText(transcriptText), status: "READY" },
    });

    try {
      const soapText = await structureSoapNote(transcriptText);
      await prisma.sessionNote.update({
        where: { id: noteId },
        data: { soapTextEnc: encryptNoteText(soapText), soapStatus: "DRAFT" },
      });
    } catch (error) {
      console.error("[notes] SOAP structuring failed:", error);
      await prisma.sessionNote.update({ where: { id: noteId }, data: { soapStatus: "FAILED" } });
    }
  } catch (error) {
    console.error("[notes] transcription failed:", error);
    await prisma.sessionNote.update({ where: { id: noteId }, data: { status: "FAILED" } });
  }
}

export async function uploadSessionAudio(
  sessionId: string,
  _prevState: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  const psychologist = await requireCurrentPsychologist();
  const session = await getOwnedSession(psychologist.id, sessionId);
  if (!session) {
    return { error: "Сесію не знайдено" };
  }

  const audioFile = formData.get("audio");
  if (!(audioFile instanceof File) || audioFile.size === 0) {
    return { error: "Аудіозапис відсутній" };
  }

  const buffer = Buffer.from(await audioFile.arrayBuffer());
  const contentType = audioFile.type || "audio/webm";
  const key = `session-notes/${sessionId}/${randomUUID()}.webm`;

  let audioUrl: string;
  try {
    audioUrl = await uploadAudioObject(key, buffer, contentType);
  } catch (error) {
    console.error("[notes] audio upload failed:", error);
    return { error: "Не вдалося завантажити аудіо. Спробуйте ще раз." };
  }

  const note = await prisma.sessionNote.upsert({
    where: { sessionId },
    create: { sessionId, audioUrl, status: "TRANSCRIBING" },
    update: {
      audioUrl,
      status: "TRANSCRIBING",
      transcriptTextEnc: null,
      editedTextEnc: null,
      soapTextEnc: null,
      soapStatus: "NONE",
    },
  });

  await runTranscriptionAndSoap(note.id, buffer, contentType);

  revalidatePath(`/sessions/${sessionId}`);
  return {};
}

export async function retryTranscription(sessionId: string): Promise<NoteActionState> {
  const psychologist = await requireCurrentPsychologist();
  const note = await getOwnedNoteBySessionId(psychologist.id, sessionId);
  if (!note?.audioUrl) {
    return { error: "Аудіозапис не знайдено" };
  }

  await prisma.sessionNote.update({ where: { id: note.id }, data: { status: "TRANSCRIBING" } });

  const { getSignedAudioUrl } = await import("@/lib/storage");
  const signedUrl = await getSignedAudioUrl(note.audioUrl);
  const response = await fetch(signedUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "audio/webm";

  await runTranscriptionAndSoap(note.id, buffer, contentType);

  revalidatePath(`/sessions/${sessionId}`);
  return {};
}

export async function retrySoap(sessionId: string): Promise<NoteActionState> {
  const psychologist = await requireCurrentPsychologist();
  const note = await getOwnedNoteBySessionId(psychologist.id, sessionId);
  if (!note?.transcriptTextEnc) {
    return { error: "Транскрипт відсутній" };
  }

  try {
    const transcriptText = decryptNoteText(note.transcriptTextEnc);
    const soapText = await structureSoapNote(transcriptText);
    await prisma.sessionNote.update({
      where: { id: note.id },
      data: { soapTextEnc: encryptNoteText(soapText), soapStatus: "DRAFT" },
    });
  } catch (error) {
    console.error("[notes] SOAP retry failed:", error);
    await prisma.sessionNote.update({ where: { id: note.id }, data: { soapStatus: "FAILED" } });
    return { error: "Не вдалося сформувати SOAP-нотатку" };
  }

  revalidatePath(`/sessions/${sessionId}`);
  return {};
}

export async function updateEditedTranscript(
  sessionId: string,
  _prevState: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  const psychologist = await requireCurrentPsychologist();
  const note = await getOwnedNoteBySessionId(psychologist.id, sessionId);
  if (!note) {
    return { error: "Нотатку не знайдено" };
  }

  const editedText = formData.get("editedText");
  if (typeof editedText !== "string") {
    return { error: "Некоректні дані" };
  }

  await prisma.sessionNote.update({
    where: { id: note.id },
    data: { editedTextEnc: encryptNoteText(editedText) },
  });

  revalidatePath(`/sessions/${sessionId}`);
  return {};
}

export async function updateSoapText(
  sessionId: string,
  _prevState: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  const psychologist = await requireCurrentPsychologist();
  const note = await getOwnedNoteBySessionId(psychologist.id, sessionId);
  if (!note) {
    return { error: "Нотатку не знайдено" };
  }

  const soapText = formData.get("soapText");
  if (typeof soapText !== "string") {
    return { error: "Некоректні дані" };
  }

  await prisma.sessionNote.update({
    where: { id: note.id },
    data: { soapTextEnc: encryptNoteText(soapText), soapStatus: "REVIEWED" },
  });

  revalidatePath(`/sessions/${sessionId}`);
  return {};
}
