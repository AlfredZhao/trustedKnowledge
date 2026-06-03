#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GIT_REMOTE="${GIT_REMOTE:-origin}"
COMMIT_MESSAGE=""
VERSION=""
CREATE_TAG=0
SKIP_BUILD=0
DRY_RUN=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/commit-to-github.sh [commit message]
  scripts/commit-to-github.sh -m "commit message"

Options:
  -m, --message MSG   Commit message to use.
      --version X.Y.Z Release version to validate and tag as vX.Y.Z.
      --no-tag        Do not create or push a Git tag, even with --version.
      --skip-build    Skip frontend build verification.
      --dry-run       Show checks and pending changes without committing.
  -h, --help          Show this help.

Environment:
  GIT_REMOTE          Git remote to push to. Defaults to origin.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for $1" >&2
        exit 2
      fi
      COMMIT_MESSAGE="$2"
      shift 2
      ;;
    --version)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for $1" >&2
        exit 2
      fi
      VERSION="$2"
      CREATE_TAG=1
      shift 2
      ;;
    --no-tag)
      CREATE_TAG=0
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      COMMIT_MESSAGE="${*:-$COMMIT_MESSAGE}"
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage
      exit 2
      ;;
    *)
      if [[ -z "$COMMIT_MESSAGE" ]]; then
        COMMIT_MESSAGE="$*"
      fi
      break
      ;;
  esac
done

cd "$PROJECT_ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This script must be run inside a Git repository." >&2
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" == "HEAD" ]]; then
  echo "Cannot commit from a detached HEAD state." >&2
  exit 1
fi

if ! git remote get-url "$GIT_REMOTE" >/dev/null 2>&1; then
  echo "Git remote '$GIT_REMOTE' does not exist." >&2
  echo "Available remotes:"
  git remote -v || true
  exit 1
fi

if [[ -n "$VERSION" ]]; then
  if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Version must use semantic form X.Y.Z, for example 0.2.0." >&2
    exit 2
  fi

  if [[ ! -f "$PROJECT_ROOT/CHANGELOG.md" ]]; then
    echo "CHANGELOG.md is required when --version is used." >&2
    exit 1
  fi

  if ! grep -qE "^## \\[$VERSION\\]" "$PROJECT_ROOT/CHANGELOG.md"; then
    echo "CHANGELOG.md does not contain a release section starting with: ## [$VERSION]" >&2
    echo "Move the relevant Unreleased entries into a versioned section before releasing." >&2
    exit 1
  fi

  if [[ "$CREATE_TAG" -eq 1 ]] && git rev-parse -q --verify "refs/tags/v$VERSION" >/dev/null; then
    echo "Tag v$VERSION already exists." >&2
    exit 1
  fi
fi

if [[ -z "$COMMIT_MESSAGE" ]]; then
  if [[ -n "$VERSION" ]]; then
    COMMIT_MESSAGE="Release $VERSION"
  else
    COMMIT_MESSAGE="Update project $(date '+%Y-%m-%d %H:%M:%S')"
  fi
fi

echo "Project: $PROJECT_ROOT"
echo "Branch:  $BRANCH"
echo "Remote:  $GIT_REMOTE ($(git remote get-url "$GIT_REMOTE"))"
if [[ -n "$VERSION" ]]; then
  echo "Version: $VERSION"
  if [[ "$CREATE_TAG" -eq 1 ]]; then
    echo "Tag:     v$VERSION"
  else
    echo "Tag:     disabled"
  fi
fi
echo

echo "Current Git status:"
git status --short --branch
echo

if [[ "$SKIP_BUILD" -eq 0 && -f "$PROJECT_ROOT/frontend/package.json" ]]; then
  echo "Running frontend build verification..."
  (cd "$PROJECT_ROOT/frontend" && npm run build)
  echo
else
  echo "Skipping frontend build verification."
  echo
fi

echo "Checking Git diff for whitespace and conflict-marker problems..."
git diff --check
echo

if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
  echo "No changes to commit."
  exit 0
fi

echo "Changes that will be committed:"
git status --short
echo
git diff --stat || true
echo

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run complete. No files were staged, committed, or pushed."
  exit 0
fi

echo "Staging all tracked, modified, deleted, and untracked files..."
git add -A

if git diff --cached --quiet; then
  echo "No staged changes to commit."
  exit 0
fi

echo
echo "Staged changes:"
git diff --cached --stat
echo

echo "Creating commit:"
echo "  $COMMIT_MESSAGE"
git commit -m "$COMMIT_MESSAGE"
echo

if [[ -n "$VERSION" && "$CREATE_TAG" -eq 1 ]]; then
  echo "Creating tag v$VERSION..."
  git tag "v$VERSION"
  echo
fi

if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  echo "Pushing to upstream..."
  git push
else
  echo "No upstream configured. Pushing and setting upstream to $GIT_REMOTE/$BRANCH..."
  git push -u "$GIT_REMOTE" "$BRANCH"
fi

if [[ -n "$VERSION" && "$CREATE_TAG" -eq 1 ]]; then
  echo
  echo "Pushing tag v$VERSION..."
  git push "$GIT_REMOTE" "v$VERSION"
fi

echo
echo "Done. Latest commit:"
git --no-pager log -1 --oneline
if [[ -n "$VERSION" && "$CREATE_TAG" -eq 1 ]]; then
  echo "Tagged release: v$VERSION"
fi
