"use client";

import { useActionState } from "react";
import { updateNoteLanguage, type NoteLanguageState } from "./actions";
import { Button } from "@/components/ui/button";
import { Label, Select, Hint } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { NOTE_LANGUAGES } from "@/lib/validation/psychologist";

// Whisper's `language` param only accepts the short ISO-639-1 code (uk/ru/en) —
// the locale suffix here is display-only, to make the option list unambiguous.
const LANGUAGE_LABELS: Record<(typeof NOTE_LANGUAGES)[number], string> = {
  uk: "Українська (uk-UA)",
  ru: "Російська (ru-RU)",
  en: "Англійська (en-US)",
};

const initialState: NoteLanguageState = {};

export function NoteLanguageForm({ noteLanguage }: { noteLanguage: string }) {
  const [state, formAction, pending] = useActionState(updateNoteLanguage, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <Label htmlFor="noteLanguage">Мова сесій</Label>
        <Select id="noteLanguage" name="noteLanguage" defaultValue={noteLanguage}>
          {NOTE_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {LANGUAGE_LABELS[lang]}
            </option>
          ))}
        </Select>
        <Hint>
          Розпізнавання мовлення орієнтується на цю мову замість автовизначення — це точніше
          для коротких або тихих записів.
        </Hint>
      </div>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">Збережено</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Збереження..." : "Зберегти"}
      </Button>
    </form>
  );
}
