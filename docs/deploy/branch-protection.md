# Branch Protection Setup

Manual one-time configuration on GitHub. Apply the same rules to `main` and `develop`.
Once set, the CI workflow (`.github/workflows/ci.yml`) becomes a real gate instead of
a nice-to-have local check.

## Per-branch rules (`main` + `develop`)

### Required

-   [ ] **Require a pull request before merging**
    -   [ ] Require approvals: **1** (or **0** while solo; bump when the team grows)
    -   [ ] Dismiss stale pull request approvals when new commits are pushed: **on**
    -   [ ] Require review from Code Owners: **on** (pairs with `.github/CODEOWNERS`)
-   [ ] **Require status checks to pass before merging**
    -   [ ] Require branches to be up to date before merging: **on**
    -   [ ] Required checks: `Lint, Typecheck, Test, Build` (the job name from `ci.yml`)
-   [ ] **Require conversation resolution before merging**
-   [ ] **Restrict who can push to matching branches** — leave empty, just block direct pushes
-   [ ] **Do not allow force pushes**
-   [ ] **Do not allow deletions**

### Recommended (defer if solo)

-   [ ] **Require signed commits** — only after the team is set up with GPG/SSH commit signing
-   [ ] **Require linear history** — keeps the graph clean; enable if you prefer squash-merge only

## Where to set this

GitHub repo → **Settings** → **Branches** → **Add branch ruleset** (or **Add classic branch protection rule** depending on which UI is enabled for the repo).

## Or via `gh` (admin scope required)

The CLI path requires the `admin:repo_hook` + `repo` token scopes. If you have them:

```bash
gh api -X PUT repos/{owner}/{repo}/branches/main/protection \
  -F required_status_checks.strict=true \
  -F required_status_checks.contexts[]='Lint, Typecheck, Test, Build' \
  -F enforce_admins=false \
  -F required_pull_request_reviews.dismiss_stale_reviews=true \
  -F required_pull_request_reviews.require_code_owner_reviews=true \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F restrictions=null \
  -F required_conversation_resolution=true \
  -F allow_force_pushes=false \
  -F allow_deletions=false
```

Run the same command with `develop` swapped in.

## Verification

After enabling, try to push directly to `main` from a clean clone:

```bash
git push origin main
```

You should see `remote: error: GH006: Protected branch update failed`. If the push
succeeds, the rule isn't active — re-check the branch name pattern (case-sensitive)
and which ruleset is "Enabled".
