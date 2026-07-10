"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { uploadSessionAudio, type NoteActionState } from "./note-actions";

export function NoteRecorder({ sessionId }: { sessionId: string }) {
  const uploadWithSessionId = uploadSessionAudio.bind(null, sessionId);
  const [state, formAction, isUploading] = useActionState<NoteActionState, FormData>(
    uploadWithSessionId,
    {}
  );

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "session-audio.webm", { type: "audio/webm" });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        if (fileInputRef.current) {
          fileInputRef.current.files = dataTransfer.files;
        }
        formRef.current?.requestSubmit();
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setError("Не вдалося отримати доступ до мікрофона. Перевірте дозволи браузера.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setIsRecording(false);
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        {isRecording ? (
          <Button type="button" variant="danger" onClick={stopRecording}>
            Зупинити запис
          </Button>
        ) : (
          <Button type="button" onClick={startRecording} disabled={isUploading}>
            {isUploading ? "Завантаження…" : "Почати запис"}
          </Button>
        )}
        {isRecording && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-danger">
            <span className="size-2 animate-pulse rounded-full bg-danger" />
            запис триває
          </span>
        )}
      </div>

      <form ref={formRef} action={formAction} className="hidden">
        <input ref={fileInputRef} type="file" name="audio" />
      </form>

      {error && (
        <Alert tone="danger" className="mt-3">
          {error}
        </Alert>
      )}
      {state.error && (
        <Alert tone="danger" className="mt-3">
          {state.error}
        </Alert>
      )}
    </div>
  );
}
