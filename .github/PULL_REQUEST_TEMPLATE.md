## Summary

<!-- 1–3 bullets on what changed and why. Link the story / issue. -->

## Test plan

<!-- What did you do to verify? Tick what applies, add more lines if relevant. -->

-   [ ] `pnpm nx run-many -t lint build test` green locally
-   [ ] Migrations (if any) apply cleanly: `echo yes | pnpm mig:up`
-   [ ] Manual smoke against `staging` for the affected feature
-   [ ] Updated story Dev Agent Record (status, checkboxes, File List)

## Risk + rollout

<!-- Optional but encouraged for changes that touch shared state. -->

-   **Blast radius:** <!-- which apps / endpoints / DB tables -->
-   **Rollback:** <!-- can we just redeploy the previous image, or does it need data work? -->
-   **Known gaps left for follow-up:** <!-- if any -->

## Screenshots / API responses

<!-- Optional. UI changes: before/after. API changes: sample request/response. -->
