# Version Management Workflow

This document explains the complete version management workflow for the Nyon Livestream Server.

## Overview

The project uses **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

Version bumping can be done:
1. **Automatically** via GitHub Actions (recommended for team workflow)
2. **Manually** via `bump-version.sh` script (for quick fixes or local testing)

---

## Automatic Version Bumping (GitHub Actions)

### How It Works

When you merge a PR to `main`, GitHub Actions automatically:
1. ✅ Detects the version bump type from your branch name or PR title
2. ✅ Updates the VERSION file
3. ✅ Updates CHANGELOG.md
4. ✅ Creates a git commit
5. ✅ Creates a git tag (e.g., `v1.0.1`)
6. ✅ Publishes a GitHub Release with release notes
7. ✅ Triggers Docker image build and publish

### Branch Naming Convention

Name your branches to indicate the version bump type:

| Branch Pattern | Bump Type | Example | Version Change |
|---------------|-----------|---------|----------------|
| `nyon/fix-*`, `fix/*` | PATCH | `nyon/fix-login-bug` | 1.0.0 → 1.0.1 |
| `nyon/feature-*`, `feat/*` | MINOR | `nyon/feature-dark-mode` | 1.0.0 → 1.1.0 |
| `nyon/breaking-*`, `major/*` | MAJOR | `nyon/breaking-api-v2` | 1.0.0 → 2.0.0 |

**Examples:**
```bash
git checkout -b nyon/fix-session-ghost      # Will bump PATCH
git checkout -b nyon/feature-webrtc         # Will bump MINOR
git checkout -b nyon/breaking-auth-rewrite  # Will bump MAJOR
```

### PR Title Detection (Fallback)

If the branch name doesn't match the pattern, the workflow checks the PR title:

- `fix:` → PATCH
- `feat:` or `feature:` → MINOR
- `BREAKING:` or `major:` → MAJOR

**Examples:**
```
fix: resolve ghost session bug              → PATCH
feat: add dark mode support                 → MINOR
BREAKING: change API authentication         → MAJOR
```

### Workflow Steps

1. **Create a feature branch:**
   ```bash
   git checkout -b nyon/fix-settings-save
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "Fix settings page save functionality"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin nyon/fix-settings-save
   ```

4. **Create a Pull Request:**
   - Go to GitHub
   - Create PR from your branch to `main`
   - Write a clear PR description

5. **Merge the PR:**
   - Review and approve
   - Click "Merge Pull Request"
   - **GitHub Actions automatically handles the rest!**

6. **What happens automatically:**
   - Version is bumped (1.0.0 → 1.0.1)
   - CHANGELOG.md is updated
   - Git tag `v1.0.1` is created
   - GitHub Release is published
   - Docker images are built and published
   - Users can now see the update in the web UI

### Checking the Release

After merging, check:
- GitHub Actions tab for workflow status
- Releases page for the new release
- Docker images: `ghcr.io/nyonnguyen/livestream-server/web-api:latest`

---

## Manual Version Bumping (Local Script)

### When to Use Manual Bumping

Use the `bump-version.sh` script when:
- You're working solo without PRs
- You need to quickly bump version for hotfix
- You want to test version bumping locally
- You're working on a fork without GitHub Actions

### Usage

```bash
# Automatic detection from branch/commits
./scripts/bump-version.sh auto

# Manual bump
./scripts/bump-version.sh patch   # 1.0.0 → 1.0.1
./scripts/bump-version.sh minor   # 1.0.0 → 1.1.0
./scripts/bump-version.sh major   # 1.0.0 → 2.0.0
```

### What It Does

1. Shows current version
2. Detects bump type (if using `auto`)
3. Asks for confirmation
4. Updates VERSION file
5. Creates git commit
6. Creates git tag
7. Shows instructions to push

### Example Workflow

```bash
# 1. Make your changes
git checkout -b nyon/fix-api-timeout
# ... make changes ...
git commit -m "Fix API timeout issue"

# 2. Bump version
./scripts/bump-version.sh auto
# Shows: Version bump: 1.0.0 → 1.0.1 (patch)
# Confirm? (y/N): y

# 3. Push everything
git push origin nyon/fix-api-timeout
git push origin v1.0.1

# 4. Manually create GitHub Release
# Go to GitHub → Releases → New Release
# Select tag v1.0.1
# Add release notes
# Publish
```

---

## Version Detection Rules

### From Branch Names

| Pattern | Type | Example |
|---------|------|---------|
| `breaking`, `major` | MAJOR | `nyon/breaking-api-change` |
| `feature`, `feat` | MINOR | `nyon/feature-notifications` |
| `fix` | PATCH | `nyon/fix-memory-leak` |
| Default | PATCH | `nyon/update-docs` |

### From Commit Messages

| Prefix | Type | Example |
|--------|------|---------|
| `BREAKING:`, `break:` | MAJOR | `BREAKING: remove deprecated API` |
| `feat:`, `feature:`, `add:` | MINOR | `feat: add user profiles` |
| `fix:` | PATCH | `fix: resolve login bug` |
| Default | PATCH | `update README` |

---

## CHANGELOG Management

### Automatic (GitHub Actions)

The workflow automatically updates CHANGELOG.md with:
- New version number and date
- PR title and number
- Link to GitHub comparison view

### Manual (When Using Script)

Update `CHANGELOG.md` manually:

```markdown
## [1.0.1] - 2026-02-16

### Fixed
- Settings page unable to save due to missing config entries
- Ghost sessions showing as live after publisher stops

[1.0.1]: https://github.com/nyonnguyen/livestream-server/compare/v1.0.0...v1.0.1
```

### Categories

Use these categories:
- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes

---

## Release Checklist

### Automatic Release (GitHub Actions)
- [ ] Create feature branch with appropriate naming
- [ ] Make changes and commit
- [ ] Push branch to GitHub
- [ ] Create and merge PR
- [ ] ✅ GitHub Actions handles everything else!

### Manual Release
- [ ] Update CHANGELOG.md
- [ ] Run `./scripts/bump-version.sh auto`
- [ ] Verify VERSION file updated
- [ ] Push: `git push && git push --tags`
- [ ] Create GitHub release manually
- [ ] Update release notes
- [ ] Verify Docker images published

---

## Comparison: Auto vs Manual

| Feature | GitHub Actions | Manual Script |
|---------|---------------|---------------|
| Version bump | ✅ Automatic | ⚠️ Manual |
| CHANGELOG update | ✅ Automatic | ⚠️ Manual |
| GitHub Release | ✅ Automatic | ⚠️ Manual |
| Docker build | ✅ Automatic | ⚠️ Manual |
| Release notes | ✅ From PR | ⚠️ Manual |
| Consistency | ✅ Always | ⚠️ Depends |
| **Recommended for** | Team workflow | Solo/hotfix |

---

## Troubleshooting

### "Workflow didn't trigger after merge"

**Check:**
1. Is the workflow file in `.github/workflows/version-bump.yml`?
2. Did you merge to `main` branch?
3. Was it a PR merge (not direct push)?
4. Check GitHub Actions tab for errors

### "Wrong version bump type detected"

**Fix:**
- Rename your branch to match conventions
- Or update PR title with proper prefix
- Or use manual bumping with explicit type

### "Tag already exists"

**If you need to re-tag:**
```bash
git tag -d v1.0.1                    # Delete local
git push origin :refs/tags/v1.0.1   # Delete remote
./scripts/bump-version.sh patch      # Bump again
```

### "CHANGELOG not updated correctly"

**Manual fix:**
```bash
# Edit CHANGELOG.md manually
git add CHANGELOG.md
git commit --amend
git push --force-with-lease origin main
```

---

## Best Practices

1. ✅ **Use branch naming conventions** - Makes auto-detection reliable
2. ✅ **Write clear PR titles** - Used in release notes
3. ✅ **Update CHANGELOG** - Even if automated (add details)
4. ✅ **Test before merging** - Version bumps are permanent
5. ✅ **Never force push tags** - Tags should be immutable
6. ✅ **Use automatic workflow** - More reliable than manual
7. ✅ **Review GitHub Release** - Add extra context if needed

---

## FAQ

### Q: Can I skip version bumping for a PR?

**A:** Yes! Add `[skip ci]` to your PR title:
```
docs: update README [skip ci]
```
The workflow won't run, no version bump.

### Q: What if I merge multiple PRs quickly?

**A:** Each PR triggers a separate version bump. If you merge:
1. PR #1 (fix) → v1.0.1
2. PR #2 (feat) → v1.1.0
3. PR #3 (fix) → v1.1.1

Each gets its own version and release.

### Q: Can I bump version without PR?

**A:** Yes, use the manual script:
```bash
./scripts/bump-version.sh patch
git push origin main --tags
```
Then create GitHub Release manually.

### Q: How do users get notified of updates?

**A:** The web UI checks for updates:
- Automatically every 6 hours
- Manually via "Check for Updates" button (About page)
- Shows notification banner when update available

---

## Related Documentation

- [VERSION-MANAGEMENT.md](VERSION-MANAGEMENT.md) - Technical details
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [CI-CD.md](CI-CD.md) - CI/CD pipeline overview

---

## Summary

**For most development work:**
1. Create branch with proper naming (`nyon/fix-*`, `nyon/feature-*`)
2. Make changes and commit
3. Create PR and merge
4. **GitHub Actions handles the rest automatically! 🎉**

**For quick local work:**
1. Use `./scripts/bump-version.sh auto`
2. Push tags
3. Create release manually

Choose automatic workflow for consistency and less manual work!
