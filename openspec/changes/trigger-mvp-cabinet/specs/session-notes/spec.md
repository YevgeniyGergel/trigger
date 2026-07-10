## ADDED Requirements

### Requirement: Voice Note Recording
The system SHALL allow a psychologist to record an audio note in the browser and attach it to a specific session.

#### Scenario: Start and stop recording
- **WHEN** a psychologist starts and then stops a voice recording on a session's page
- **THEN** the system saves the audio to storage and creates a session note in "transcribing" status

#### Scenario: Recording without microphone permission
- **WHEN** a psychologist attempts to record without having granted microphone access
- **THEN** the system prompts for microphone permission and does not create a note until access is granted

### Requirement: Automatic Transcription
The system SHALL automatically transcribe an uploaded voice note into text and associate the transcript with the session note.

#### Scenario: Transcription succeeds
- **WHEN** an uploaded voice note finishes processing successfully
- **THEN** the system stores the transcript text and updates the note status to "ready"

#### Scenario: Transcription fails
- **WHEN** transcription processing fails
- **THEN** the system marks the note status as "failed" and allows the psychologist to retry transcription or discard the note

### Requirement: SOAP Structuring
The system SHALL automatically structure a completed transcript into a SOAP (Subjective, Objective, Assessment, Plan) format using an AI structuring call, and present it as an editable draft.

#### Scenario: SOAP draft generated after transcription
- **WHEN** a voice note's transcript finishes processing successfully
- **THEN** the system generates a SOAP-structured draft from the transcript and marks it as unreviewed

#### Scenario: SOAP structuring fails
- **WHEN** the AI structuring call fails
- **THEN** the system keeps the raw transcript available and allows the psychologist to retry SOAP structuring or continue with the raw transcript only

#### Scenario: Draft requires review before being treated as final
- **WHEN** a SOAP draft has not yet been reviewed by the psychologist
- **THEN** the system visibly labels it as a draft and does not present it as a finalized clinical record

### Requirement: Note Editing
The system SHALL allow a psychologist to manually edit both the raw transcript and the SOAP-structured text of a session note.

#### Scenario: Edit transcript text
- **WHEN** a psychologist edits the transcript text of a ready note
- **THEN** the system saves the edited text while preserving the original audio

#### Scenario: Edit and confirm SOAP draft
- **WHEN** a psychologist edits and confirms a SOAP draft
- **THEN** the system saves the edited SOAP text and marks the note as reviewed

### Requirement: Note Encryption
The system SHALL encrypt transcript and SOAP text at the application level using a key managed outside the primary database, so that direct database access does not expose readable note content.

#### Scenario: Note content stored encrypted
- **WHEN** a transcript or SOAP text is saved
- **THEN** the system stores it encrypted using a key retrieved from the key management service, not embedded in the database

#### Scenario: Server decrypts for AI structuring only
- **WHEN** the system sends a transcript to the AI structuring call
- **THEN** decryption happens only in the backend service process, never exposing plaintext to database administrators or client-side code beyond the authenticated request

### Requirement: Note Access Restricted to Owning Psychologist
The system SHALL restrict access to a session note's audio and transcript to the psychologist who owns the associated session.

#### Scenario: Owner can view note
- **WHEN** the owning psychologist opens a client's session
- **THEN** the system displays the associated note's audio player and transcript

#### Scenario: Non-owner cannot access note
- **WHEN** any other account attempts to access the audio file or transcript URL directly
- **THEN** the system denies access
