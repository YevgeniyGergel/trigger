"use client";

import { useActionState, useState } from "react";
import { addBlockedRange, type BlockedRangeFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const initialState: BlockedRangeFormState = {};

export function BlockedRangeForm() {
  const [state, formAction, pending] = useActionState(addBlockedRange, initialState);
  const awaitingConfirmation = state.conflictWarning != null;

  // React resets uncontrolled form fields after a Server Action completes,
  // which would wipe the dates the user just entered right when the
  // conflict-warning round-trip needs them preserved for the confirm click —
  // so these are controlled state instead of defaultValue.
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("");

  // "Adjusting state during render" (React's own recommended pattern for
  // this — see https://react.dev/learn/you-might-not-need-an-effect) to
  // clear the form the moment a submission resolves successfully (no
  // error, no conflict warning). Tracking the previous state via useState
  // (not useRef, which this project's React Compiler lint rules disallow
  // reading/writing during render) lets us detect "state just changed" and
  // bail out with corrected state before the browser paints.
  const [lastHandledState, setLastHandledState] = useState(initialState);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (!state.error && !state.conflictWarning && state !== initialState) {
      setStartAt("");
      setEndAt("");
      setReason("");
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startAt">Від</Label>
          <Input
            id="startAt"
            name="startAt"
            type="datetime-local"
            required
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="endAt">До</Label>
          <Input
            id="endAt"
            name="endAt"
            type="datetime-local"
            required
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="reason">Причина</Label>
        <Input
          id="reason"
          name="reason"
          type="text"
          placeholder="Відпустка, навчання..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      {/* Tie confirmation to the exact range the warning was issued for: if
          the user edits the dates after seeing a warning, these hidden
          fields no longer match the new startAt/endAt, so the server
          re-runs the conflict check instead of trusting a stale "confirmed"
          flag for a range it never actually warned about. */}
      <input type="hidden" name="confirmedForStart" value={state.confirmedFor?.startAt ?? ""} />
      <input type="hidden" name="confirmedForEnd" value={state.confirmedFor?.endAt ?? ""} />

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.conflictWarning ? (
        <Alert tone="warning">{state.conflictWarning}</Alert>
      ) : null}

      <Button
        type="submit"
        variant={awaitingConfirmation ? "danger" : "primary"}
        disabled={pending}
      >
        {pending ? "Збереження..." : awaitingConfirmation ? "Блокувати попри це" : "Заблокувати"}
      </Button>
    </form>
  );
}
