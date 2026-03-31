# Project Build Rules

These rules govern the build process unless explicitly revised.

## 1. Keep a Findings Log

Record every meaningful result in `FINDINGS.md`: successes, failures, gotchas, behavior, and decisions. Use a timestamp, short title, and clear detail.

## 2. Keep Context Current

`CONTEXT.md` must reflect the current system as it exists now: components, dependencies, config, file roles, and integrations. If the build changes, update the context immediately.

## 3. Test Integrations in Isolation First

Validate external integrations and risky components in standalone tests before wiring them into production code. Iterate there until they work, then integrate cleanly.

## 4. Build for Portability

- Provide a clear `README.md`.
- Pin dependencies with the appropriate lock file.
- Put config in files or environment variables, never hardcoded secrets or machine-specific paths.
- Maintain a complete `.env.example`.
- Document any non-obvious system dependency.

## 5. Build in Small, Tested Steps

For each new change:
1. Add it.
2. Validate it in context.
3. Refine until it passes.
4. Move on.

Do not pile up untested work.

## 6. Keep It Lean

- Prefer the simplest solution that fully solves the problem.
- Avoid bloat, dead code, speculative abstractions, and unnecessary dependencies.
- Every file, function, and dependency must justify its existence.

## 7. Do It Correctly

- No placeholders meant to be fixed later.
- No skipped error handling at system boundaries.
- No broken code committed for the sake of speed.
- If an error appears, investigate it directly instead of working around it.

## 8. Keep the Project Clean

- Use a clear structure such as `src/`, `tests/`, `config/`, and `docs/`.
- Create directories when needed, not preemptively.
- Keep test artifacts, local data, and secrets out of version control.

## 9. Maintain Git Hygiene

- Commit at meaningful, tested milestones.
- Write commit messages that explain what changed and why.
- Never commit secrets, credentials, or `.env` files.
- Keep `.gitignore` accurate from the start.

## 10. Protect Sensitive Data

- Never store secrets or sensitive user data in plaintext.
- Keep secrets in environment variables or secure storage.
- Never commit encryption keys or credentials.
- Only decrypt or expose sensitive values at the moment of use.

## 11. Focus Sequentially

- Work on one phase, feature, or integration at a time.
- Do not move to the next phase until the current one is validated.
- Serial focus beats fragmented progress.

## 12. Document Decisions and Progress

Record why important decisions were made, not just what was chosen. Keep enough progress notes that work can resume cleanly even after context is lost.

## 13. Fail Loudly, Log Clearly

- During development, let errors surface instead of swallowing them.
- Log meaningful inputs, outputs, failures, and timing around important operations.
- Use structured production logging when appropriate.

## 14. Keep Runs Reproducible

- Tests and important runs should be reproducible from the same config.
- Control randomness in tests when possible.
- Pin tool versions when reproducibility depends on them.

## 15. Review Before Advancing

Before moving forward:
- Re-read `RULES.MD`.
- Update `CONTEXT.md`.
- Review `FINDINGS.md`.
- Confirm the next step still makes sense based on what was learned.

## 16. Commit and Push Cleanly

- Commit and push often enough to avoid large, risky deltas.
- Do not include unconfirmed code, stale information, old tests, or non-production leftovers.
- Keep the repository clean.
