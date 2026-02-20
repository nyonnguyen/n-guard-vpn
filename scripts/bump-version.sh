#!/bin/bash

#######################################
# N-Guard VPN Version Bump Script
#######################################
# Usage:
#   ./scripts/bump-version.sh auto     # Auto-detect from branch/commits
#   ./scripts/bump-version.sh patch    # 1.0.0 → 1.0.1
#   ./scripts/bump-version.sh minor    # 1.0.0 → 1.1.0
#   ./scripts/bump-version.sh major    # 1.0.0 → 2.0.0
#######################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION_FILE="$PROJECT_ROOT/VERSION"
CHANGELOG_FILE="$PROJECT_ROOT/CHANGELOG.md"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if VERSION file exists
check_version_file() {
    if [ ! -f "$VERSION_FILE" ]; then
        print_error "VERSION file not found at: $VERSION_FILE"
        exit 1
    fi
}

# Function to read current version
read_current_version() {
    check_version_file
    local version=$(cat "$VERSION_FILE" | tr -d '[:space:]')
    if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        print_error "Invalid version format in VERSION file: $version"
        print_error "Expected format: X.Y.Z (e.g., 1.0.0)"
        exit 1
    fi
    echo "$version"
}

# Function to parse version components
parse_version() {
    local version=$1
    IFS='.' read -r MAJOR MINOR PATCH <<< "$version"
}

# Function to detect bump type from git branch name
detect_bump_from_branch() {
    local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

    if [[ "$branch" =~ (nyon/|^)breaking- ]] || [[ "$branch" =~ (nyon/|^)major- ]]; then
        echo "major"
    elif [[ "$branch" =~ (nyon/|^)feature- ]] || [[ "$branch" =~ (nyon/|^)feat- ]]; then
        echo "minor"
    elif [[ "$branch" =~ (nyon/|^)fix- ]] || [[ "$branch" =~ (nyon/|^)bugfix- ]]; then
        echo "patch"
    else
        echo ""
    fi
}

# Function to detect bump type from recent commit messages
detect_bump_from_commits() {
    local commits=$(git log --oneline -10 --pretty=format:"%s" 2>/dev/null || echo "")

    if echo "$commits" | grep -qiE "^(BREAKING:|major:)"; then
        echo "major"
    elif echo "$commits" | grep -qiE "^(feat:|feature:)"; then
        echo "minor"
    elif echo "$commits" | grep -qiE "^(fix:|bugfix:)"; then
        echo "patch"
    else
        echo ""
    fi
}

# Function to auto-detect bump type
auto_detect_bump_type() {
    print_info "Auto-detecting version bump type..."

    local bump_type=$(detect_bump_from_branch)
    if [ -n "$bump_type" ]; then
        print_info "Detected from branch name: $bump_type"
        echo "$bump_type"
        return
    fi

    bump_type=$(detect_bump_from_commits)
    if [ -n "$bump_type" ]; then
        print_info "Detected from commit messages: $bump_type"
        echo "$bump_type"
        return
    fi

    print_warning "Could not auto-detect bump type, defaulting to 'patch'"
    echo "patch"
}

# Function to calculate new version
calculate_new_version() {
    local current_version=$1
    local bump_type=$2

    parse_version "$current_version"

    case "$bump_type" in
        major)
            MAJOR=$((MAJOR + 1))
            MINOR=0
            PATCH=0
            ;;
        minor)
            MINOR=$((MINOR + 1))
            PATCH=0
            ;;
        patch)
            PATCH=$((PATCH + 1))
            ;;
        *)
            print_error "Invalid bump type: $bump_type"
            print_error "Valid types: major, minor, patch, auto"
            exit 1
            ;;
    esac

    echo "$MAJOR.$MINOR.$PATCH"
}

# Function to update VERSION file
update_version_file() {
    local new_version=$1
    echo "$new_version" > "$VERSION_FILE"
    print_success "Updated VERSION file to: $new_version"
}

# Function to update CHANGELOG.md
update_changelog() {
    local new_version=$1
    local current_date=$(date +%Y-%m-%d)

    if [ ! -f "$CHANGELOG_FILE" ]; then
        print_warning "CHANGELOG.md not found, skipping changelog update"
        return
    fi

    # Create new version entry
    local new_entry="## [$new_version] - $current_date

### Changed
- Version bump to $new_version

"

    # Insert new entry after the header (after first "##" or at line 7)
    if grep -q "^## \[" "$CHANGELOG_FILE"; then
        # Insert before first version entry
        sed -i.bak "/^## \[/i\\
$new_entry
" "$CHANGELOG_FILE"
    else
        # Insert after header (assuming 6-7 lines of header)
        sed -i.bak "7i\\
$new_entry
" "$CHANGELOG_FILE"
    fi

    # Add comparison link at the end
    local last_version=$(grep -oP "(?<=\[)[0-9]+\.[0-9]+\.[0-9]+(?=\]:)" "$CHANGELOG_FILE" | head -2 | tail -1)
    if [ -n "$last_version" ]; then
        echo "[$new_version]: https://github.com/nyonnguyen/n-guard-vpn/compare/v${last_version}...v${new_version}" >> "$CHANGELOG_FILE"
    else
        echo "[$new_version]: https://github.com/nyonnguyen/n-guard-vpn/releases/tag/v${new_version}" >> "$CHANGELOG_FILE"
    fi

    # Remove backup file
    rm -f "$CHANGELOG_FILE.bak"

    print_success "Updated CHANGELOG.md with version $new_version"
}

# Function to create git commit and tag
create_git_commit_and_tag() {
    local new_version=$1

    # Check if there are changes to commit
    if ! git diff --quiet VERSION CHANGELOG.md 2>/dev/null; then
        git add VERSION CHANGELOG.md
        git commit -m "chore: bump version to v$new_version"
        print_success "Created git commit"
    else
        print_warning "No changes to commit"
    fi

    # Create git tag
    if git rev-parse "v$new_version" >/dev/null 2>&1; then
        print_warning "Tag v$new_version already exists, skipping tag creation"
    else
        git tag -a "v$new_version" -m "Release version $new_version"
        print_success "Created git tag: v$new_version"
    fi
}

# Function to display push instructions
display_push_instructions() {
    local new_version=$1
    local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

    echo ""
    echo "=========================================="
    print_success "Version bumped to v$new_version"
    echo "=========================================="
    echo ""
    print_info "Next steps:"
    echo "  1. Review the changes:"
    echo "     ${YELLOW}git log --oneline -2${NC}"
    echo "     ${YELLOW}git diff HEAD~1 VERSION CHANGELOG.md${NC}"
    echo ""
    echo "  2. Push to remote:"
    echo "     ${YELLOW}git push origin $branch${NC}"
    echo "     ${YELLOW}git push origin v$new_version${NC}"
    echo ""
    echo "  3. Create a Pull Request on GitHub (if on feature branch)"
    echo "     or the CI/CD will automatically create a release"
    echo ""
}

# Main script logic
main() {
    # Change to project root
    cd "$PROJECT_ROOT"

    # Check if inside a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not inside a git repository"
        exit 1
    fi

    # Get bump type from argument or auto-detect
    local bump_type="${1:-auto}"

    if [ "$bump_type" = "auto" ]; then
        bump_type=$(auto_detect_bump_type)
    fi

    # Validate bump type
    if [[ ! "$bump_type" =~ ^(major|minor|patch)$ ]]; then
        print_error "Invalid bump type: $bump_type"
        echo ""
        echo "Usage: $0 {auto|major|minor|patch}"
        echo ""
        echo "  auto   - Auto-detect from branch name or commit messages"
        echo "  major  - Bump major version (X.0.0)"
        echo "  minor  - Bump minor version (X.Y.0)"
        echo "  patch  - Bump patch version (X.Y.Z)"
        echo ""
        exit 1
    fi

    # Read current version
    local current_version=$(read_current_version)
    print_info "Current version: $current_version"

    # Calculate new version
    local new_version=$(calculate_new_version "$current_version" "$bump_type")
    print_info "Bump type: $bump_type"
    print_info "New version: $new_version"

    # Confirm with user (if interactive)
    if [ -t 0 ]; then
        echo ""
        read -p "$(echo -e ${YELLOW}Proceed with version bump? [y/N]:${NC} )" -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Version bump cancelled"
            exit 0
        fi
    fi

    # Update VERSION file
    update_version_file "$new_version"

    # Update CHANGELOG.md
    update_changelog "$new_version"

    # Create git commit and tag
    create_git_commit_and_tag "$new_version"

    # Display push instructions
    display_push_instructions "$new_version"
}

# Run main function
main "$@"
