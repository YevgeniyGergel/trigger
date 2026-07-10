"use client";

import { useActionState, useState } from "react";
import { addBlockedRange, type BlockedRangeFormState } from "./actions";

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
    <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="startAt" className="block text-sm font-medium">
          Від
        </label>
        <input
          id="startAt"
          name="startAt"
          type="datetime-local"
          required
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          className="mt-1 rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="endAt" className="block text-sm font-medium">
          До
        </label>
        <input
          id="endAt"
          name="endAt"
          type="datetime-local"
          required
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
          className="mt-1 rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="reason" className="block text-sm font-medium">
          Причина
        </label>
        <input
          id="reason"
          name="reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 rounded border px-3 py-2"
        />
      </div>
      {/* Tie confirmation to the exact range the warning was issued for: if
          the user edits the dates after seeing a warning, these hidden
          fields no longer match the new startAt/endAt, so the server
          re-runs the conflict check instead of trusting a stale "confirmed"
          flag for a range it never actually warned about. */}
      <input type="hidden" name="confirmedForStart" value={state.confirmedFor?.startAt ?? ""} />
      <input type="hidden" name="confirmedForEnd" value={state.confirmedFor?.endAt ?? ""} />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Збереження..." : awaitingConfirmation ? "Блокувати попри це" : "Заблокувати"}
      </button>

      {state.error ? (
        <p className="w-full text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.conflictWarning ? (
        <p className="w-full text-sm text-amber-600" role="alert">
          {state.conflictWarning}
        </p>
      ) : null}
    </form>
  );
}
