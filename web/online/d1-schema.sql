CREATE TABLE verifier_meta (id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL, cleanup_cursor TEXT);
--> statement-breakpoint
-- A failed optimistic-write guard aborts the entire D1 batch, including writes
-- later in the batch. This table intentionally never contains rows.
CREATE TABLE verifier_conflict (id INTEGER CONSTRAINT kyoto_concurrent_write CHECK (id = 0));
--> statement-breakpoint
CREATE TABLE verifier_players (id TEXT PRIMARY KEY, credentialHash TEXT NOT NULL, name TEXT NOT NULL, created INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE verifier_courses (id TEXT PRIMARY KEY, owner TEXT NOT NULL, revision INTEGER NOT NULL, published INTEGER NOT NULL, layout TEXT NOT NULL, physics TEXT NOT NULL, data TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE verifier_attempts (id TEXT PRIMARY KEY, owner TEXT NOT NULL, courseId TEXT NOT NULL, courseKey TEXT NOT NULL, state TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, duration REAL NOT NULL DEFAULT 0, accepted INTEGER NOT NULL DEFAULT 0, success INTEGER NOT NULL DEFAULT 0, expiresAt INTEGER, leaseUntil INTEGER, data TEXT NOT NULL, checkpoint BLOB);
--> statement-breakpoint
CREATE INDEX verifier_rank ON verifier_attempts (courseKey, state, score DESC, duration, accepted, id);
--> statement-breakpoint
CREATE INDEX verifier_personal ON verifier_attempts (owner, courseKey, state, score DESC, duration, accepted, id);
--> statement-breakpoint
CREATE INDEX verifier_expiry ON verifier_attempts (expiresAt);
--> statement-breakpoint
CREATE INDEX verifier_course_jobs ON verifier_attempts (courseId);
--> statement-breakpoint
CREATE TABLE verifier_inputs (attempt TEXT NOT NULL, sequence INTEGER NOT NULL, hash TEXT NOT NULL, runs TEXT NOT NULL, bytes INTEGER NOT NULL, PRIMARY KEY (attempt, sequence));
--> statement-breakpoint
CREATE TABLE verifier_progress (owner TEXT NOT NULL, courseKey TEXT NOT NULL, courseId TEXT NOT NULL, revision INTEGER NOT NULL, PRIMARY KEY (owner, courseKey));
--> statement-breakpoint
CREATE TABLE verifier_usage (id TEXT PRIMARY KEY, data TEXT NOT NULL);
