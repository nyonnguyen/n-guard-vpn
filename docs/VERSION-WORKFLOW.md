# Version Management Workflow

This document explains the complete version management workflow for N-Guard VPN.

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
7. ✅ Builds and attaches release artifacts (configs, docs, full source)

### Branch Naming Convention

Name your branches to indicate the version bump type:

| Branch Pattern | Bump Type | Example | Version Change |
|---------------|-----------|---------|----------------|
| `nyon/fix-*`, `fix/*` | PATCH | `nyon/fix-login-bug` | 1.0.0 → 1.0.1 |
| `nyon/feature-*`, `feat/*` | MINOR | `nyon/feature-dark-mode` | 1.0.0 → 1.1.0 |
| `nyon/breaking-*`, `major/*` | MAJOR | `nyon/breaking-api-v2` | 1.0.0 → 2.0.0 |

**Examples:**
```bash
git checkout -b nyon/fix-wireguard-config    # Will bump PATCH
git checkout -b nyon/feature-ipv6-support    # Will bump MINOR
git checkout -b nyon/breaking-docker-compose # Will bump MAJOR
```

### PR Title Detection (Fallback)

If the branch name doesn't match the pattern, the workflow checks the PR title:

- `fix:` → PATCH
- `feat:` or `feature:` → MINOR
- `BREAKING:` or `major:` → MAJOR

**Examples:**
```
fix: resolve DNS leak in iptables rules     → PATCH
feat: add IPv6 support for WireGuard        → MINOR
BREAKING: migrate to Docker Compose v3      → MAJOR
```

### Workflow Steps

1. **Create a feature branch:**
   ```bash
   git checkout -b nyon/fix-adguard-config
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "Fix AdGuard Home configuration"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin nyon/fix-adguard-config
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
   - Release artifacts are built and attached (configs, docs, full source)

### Checking the Release

After merging, check:
- GitHub Actions tab for workflow status
- Releases page for the new release
- Download and verify release artifacts (configs, docs, full source)

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
git checkout -b nyon/fix-healthcheck-timeout
# ... make changes ...
git commit -m "Fix healthcheck script timeout issue"

# 2. Bump version
./scripts/bump-version.sh auto
# Shows: Version bump: 1.0.0 → 1.0.1 (patch)
# Confirm? (y/N): y

# 3. Push everything
git push origin nyon/fix-healthcheck-timeout
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
| `breaking`, `major` | MAJOR | `nyon/breaking-docker-compose-v3` |
| `feature`, `feat` | MINOR | `nyon/feature-ipv6-support` |
| `fix` | PATCH | `nyon/fix-dns-leak` |
| Default | PATCH | `nyon/update-docs` |

### From Commit Messages

| Prefix | Type | Example |
|--------|------|---------|
| `BREAKING:`, `break:` | MAJOR | `BREAKING: remove Squid proxy support` |
| `feat:`, `feature:`, `add:` | MINOR | `feat: add IPv6 WireGuard support` |
| `fix:` | PATCH | `fix: resolve iptables DNS leak` |
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
## [1.0.1] - 2026-02-20

### Fixed
- AdGuard Home configuration not persisting after restart
- WireGuard clients unable to connect after DNS changes
- DNS leak in iptables rules when VPN drops

[1.0.1]: https://github.com/nyonnguyen/n-guard-vpn/compare/v1.0.0...v1.0.1
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
| Release artifacts | ✅ Automatic | ⚠️ Manual |
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

**A:** Users can check for updates:
- Monitor the GitHub Releases page: https://github.com/nyonnguyen/n-guard-vpn/releases
- Subscribe to release notifications on GitHub (Watch → Custom → Releases)
- Check the version with: `cat VERSION`
- Compare with latest release tag: `git fetch --tags && git tag -l | tail -1`

---

## N-Guard VPN Specific Notes

### What Gets Versioned

N-Guard VPN versions track changes to:
- **Configuration files:** docker-compose.yml, .env.template, service configs
- **Automation scripts:** setup.sh, backup.sh, healthcheck.sh, update-blocklists.sh
- **Firewall rules:** iptables-rules.sh
- **Documentation:** All .md files (INSTALL.md, CLIENT-SETUP.md, etc.)
- **Project structure:** Directory layout, Docker Compose services

### What Doesn't Get Versioned

These are not part of version control:
- **Docker images:** Uses public images from Docker Hub/GHCR (linuxserver/wireguard, adguard/adguardhome, etc.)
- **Generated VPN configs:** wireguard/config/* (user-specific)
- **Runtime data:** AdGuard database, DNS cache, logs
- **User secrets:** .env file with passwords and keys

### Release Artifacts

Each release includes three downloadable artifacts:

1. **n-guard-vpn-vX.Y.Z.tar.gz** - Complete source code
   - Everything needed for new installation
   - Includes all configs, scripts, and documentation
   - Extract and run `./scripts/setup.sh` to install

2. **n-guard-vpn-configs-vX.Y.Z.tar.gz** - Configuration files only
   - For updating existing installations
   - Includes docker-compose.yml, scripts, service configs
   - Compare with your current setup before applying

3. **n-guard-vpn-docs-vX.Y.Z.tar.gz** - Documentation bundle
   - All documentation files
   - Useful for offline reference
   - Includes INSTALL.md, CLIENT-SETUP.md, TROUBLESHOOTING.md

4. **checksums.txt** - SHA256 checksums for verification
   - Verify downloads: `sha256sum -c checksums.txt`

### Upgrading N-Guard VPN

To upgrade to a new version:

**1. Backup your configuration:**
```bash
./scripts/backup.sh
```

**2. Download new version:**
```bash
# Full source (recommended for major versions)
wget https://github.com/nyonnguyen/n-guard-vpn/releases/download/vX.Y.Z/n-guard-vpn-vX.Y.Z.tar.gz
tar -xzf n-guard-vpn-vX.Y.Z.tar.gz

# OR configs only (for minor/patch updates)
wget https://github.com/nyonnguyen/n-guard-vpn/releases/download/vX.Y.Z/n-guard-vpn-configs-vX.Y.Z.tar.gz
tar -xzf n-guard-vpn-configs-vX.Y.Z.tar.gz
```

**3. Review changes:**
```bash
# Check CHANGELOG for breaking changes
cat CHANGELOG.md

# Compare configurations
diff docker-compose.yml n-guard-vpn-configs-X.Y.Z/docker-compose.yml
diff .env.template n-guard-vpn-configs-X.Y.Z/.env.template
```

**4. Update scripts and configs:**
```bash
# Copy updated scripts
cp n-guard-vpn-configs-X.Y.Z/scripts/*.sh scripts/
chmod +x scripts/*.sh

# Merge config changes if needed
# Review and manually update your .env file if .env.template changed
```

**5. Pull latest Docker images:**
```bash
docker-compose pull
```

**6. Restart services:**
```bash
docker-compose down
docker-compose up -d
```

**7. Verify everything works:**
```bash
./scripts/healthcheck.sh
```

### Version Bump Guidelines for N-Guard VPN

**MAJOR version (X.0.0):**
- Breaking changes requiring manual migration
- Changes to docker-compose.yml structure
- New required environment variables in .env
- Removal of services or features
- Changes requiring client reconfiguration

**Examples:**
- Migrating from Docker Compose v2 to v3
- Removing Squid proxy (MITM feature)
- Changing WireGuard config format
- Switching from AdGuard to Pi-hole

**MINOR version (X.Y.0):**
- New features (backward compatible)
- New optional services
- New automation scripts
- Performance improvements
- New documentation

**Examples:**
- Adding IPv6 support
- Adding new blocklists
- Adding Redis caching layer
- Adding web-based admin panel
- Improving AdGuard config

**PATCH version (X.Y.Z):**
- Bug fixes
- Script improvements
- Documentation updates
- Configuration tweaks
- Security updates

**Examples:**
- Fixing DNS leak in iptables
- Fixing healthcheck timeout
- Updating blocklist URLs
- Correcting documentation typos
- Updating dependency versions

---

## Related Documentation

- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [INSTALL.md](INSTALL.md) - Installation guide
- [CLIENT-SETUP.md](CLIENT-SETUP.md) - Client configuration
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Troubleshooting guide

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
