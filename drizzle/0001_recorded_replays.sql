ALTER TABLE verifier_players ADD COLUMN named INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint
CREATE TABLE verifier_recordings (attempt TEXT NOT NULL, sequence INTEGER NOT NULL, hash TEXT NOT NULL, data TEXT NOT NULL, bytes INTEGER NOT NULL, PRIMARY KEY (attempt, sequence));
--> statement-breakpoint
-- One-time import receipts prevent retries from restoring a recalled score.
CREATE TABLE verifier_native_imports (hash TEXT PRIMARY KEY);
