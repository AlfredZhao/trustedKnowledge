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
  scripts/commit-to-github.sh --version X.Y.Z
  scripts/commit-to-github.sh --version X.Y.Z -m "Release X.Y.Z"

Options:
  -m, --message MSG
      Commit message to use. If omitted, the script uses:
        - "Update project YYYY-MM-DD HH:MM:SS" for normal commits
        - "Release X.Y.Z" for version releases

  --version X.Y.Z
      Release version. The value may also be written as vX.Y.Z.
      This promotes CHANGELOG.md "本次版本更新" / "### [Unreleased]"
      notes into a release section "### [X.Y.Z] - YYYY-MM-DD",
      creates and pushes tag vX.Y.Z, then reopens a blank local
      "### [Unreleased]" section after the push.

      Example: --version 0.2.1
        1. commit current changes plus CHANGELOG.md Unreleased notes as 0.2.1
        2. create and push tag v0.2.1
        3. reopen an empty local "本次版本更新" / "Unreleased" section

  --no-tag
      Do not create or push a Git tag, even with --version.
      With --no-tag, CHANGELOG.md is not rolled forward locally.

  --skip-build
      Skip frontend build verification.

  --dry-run
      Show checks, version parsing, pending changes, and diff stats
      without staging, committing, tagging, rolling changelog, or pushing.

  -h, --help
      Show this help.

Environment:
  GIT_REMOTE
      Git remote to push to. Defaults to origin.

Common Examples:
  scripts/commit-to-github.sh
      Normal commit and push. Runs frontend build if frontend/package.json exists.
      No tag is created. CHANGELOG.md is not rolled forward.

  scripts/commit-to-github.sh -m "add todo workflow"
      Normal commit and push with a custom commit message.

  scripts/commit-to-github.sh -m "docs update" --skip-build
      Commit and push without running the frontend build.

  scripts/commit-to-github.sh --dry-run --skip-build
      Preview what would be committed without changing Git state.

  scripts/commit-to-github.sh --version 0.2.1
      Release 0.2.1 from CHANGELOG.md "### [Unreleased]".
      Tags v0.2.1 and then reopens "### [Unreleased]" locally.

  scripts/commit-to-github.sh --version v0.2.1 -m "Release 0.2.1"
      Same release flow, with an explicit commit message.

  scripts/commit-to-github.sh --version 0.2.1 --dry-run --skip-build
      Preview a release. Does not commit, tag, push, or edit CHANGELOG.md.

  scripts/commit-to-github.sh --version 0.2.1 --no-tag
      Commit with release validation but do not tag or roll CHANGELOG.md.

Release Changelog Requirement:
  When --version is used, CHANGELOG.md must contain "### [Unreleased]"
  directly under "## 本次版本更新". The script promotes that section
  into the requested release version.
USAGE
}

fail() {
  echo "$*" >&2
  exit 1
}

normalize_version() {
  local version="${1#v}"

  if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Version must use semantic form X.Y.Z or vX.Y.Z, for example 0.2.1." >&2
    return 2
  fi

  echo "$version"
}

get_current_changelog_heading() {
  awk '
    /^## 本次版本更新[[:space:]]*$/ { in_current = 1; next }
    /^## / && in_current { exit }
    in_current && /^### / { print; exit }
  ' "$PROJECT_ROOT/CHANGELOG.md"
}

validate_release_changelog() {
  local version="$1"
  local current_heading section_count

  [[ -f "$PROJECT_ROOT/CHANGELOG.md" ]] || fail "CHANGELOG.md is required when --version is used."

  current_heading="$(get_current_changelog_heading)"
  if [[ -z "$current_heading" ]]; then
    fail "CHANGELOG.md must contain a '### [Unreleased]' section under '## 本次版本更新'."
  fi

  if [[ "$current_heading" != "### [Unreleased]" ]]; then
    fail "CHANGELOG.md must start '## 本次版本更新' with '### [Unreleased]'. Found: $current_heading"
  fi

  section_count="$(grep -Ec "^### \\[$version\\](\\]|[[:space:]-])" "$PROJECT_ROOT/CHANGELOG.md" || true)"
  if [[ "$section_count" -gt 0 ]]; then
    fail "CHANGELOG.md already contains a release section for $version. Pick a new version or fix the changelog first."
  fi
}

promote_unreleased_to_release() {
  local version="$1"
  local release_date

  release_date="$(date '+%Y-%m-%d')"

  python3 - "$PROJECT_ROOT/CHANGELOG.md" "$version" "$release_date" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
version = sys.argv[2]
release_date = sys.argv[3]

text = path.read_text()

current_heading = "## 本次版本更新"
history_heading = "## 历史版本更新"

if current_heading not in text:
    raise SystemExit(f"Missing changelog heading: {current_heading}")
if history_heading not in text:
    raise SystemExit(f"Missing changelog heading: {history_heading}")

if re.search(rf"^### \[{re.escape(version)}\](?:\]|[\s-])", text, re.M):
    raise SystemExit(f"CHANGELOG.md already contains a release section for {version}")

pattern = re.compile(
    r"(^## 本次版本更新\s*\n+)(### \[Unreleased\][^\n]*\n.*?)(?=^### \[|^## 历史版本更新\s*$)",
    re.M | re.S,
)
match = pattern.search(text)
if not match:
    raise SystemExit("Unable to find current Unreleased changelog section")

release_block = match.group(2).strip()
release_block = re.sub(
    r"^### \[Unreleased\][^\n]*$",
    f"### [{version}] - {release_date}",
    release_block,
    count=1,
    flags=re.M,
)
text = f"{text[:match.start()]}{match.group(1)}{release_block}\n\n{text[match.end():]}"

path.write_text(text)
PY
}

roll_changelog_after_release() {
  local version="$1"

  python3 - "$PROJECT_ROOT/CHANGELOG.md" "$version" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
version = sys.argv[2]

text = path.read_text()

current_heading = "## 本次版本更新"
history_heading = "## 历史版本更新"

if current_heading not in text:
    raise SystemExit(f"Missing changelog heading: {current_heading}")
if history_heading not in text:
    raise SystemExit(f"Missing changelog heading: {history_heading}")

current_part, _ = text.split(history_heading, 1)
if re.search(r"^### \[Unreleased\]", current_part, re.M):
    raise SystemExit("Current changelog already contains an Unreleased section")

if not re.search(rf"^### \[{re.escape(version)}\](?:\]|[\s-])", current_part, re.M):
    raise SystemExit(f"Unable to find release section for {version} under {current_heading}")

unreleased_block = """## 本次版本更新

### [Unreleased]

#### Added / 新增

#### Changed / 变更

#### Fixed / 修复

"""

text = text.replace(f"{current_heading}\n\n", unreleased_block, 1)
path.write_text(text)
PY
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
  VERSION="$(normalize_version "$VERSION")"
  validate_release_changelog "$VERSION"

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

if [[ -n "$VERSION" ]]; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "Dry run: would promote CHANGELOG.md Unreleased notes to release $VERSION."
    echo
  else
    echo "Promoting CHANGELOG.md Unreleased notes to release $VERSION..."
    promote_unreleased_to_release "$VERSION"
    echo
  fi
fi

if [[ -z "$VERSION" ]] && git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
  echo "No changes to commit."
  exit 0
fi

echo "Changes that will be committed:"
git status --short
echo
git diff --stat || true
echo

if [[ "$DRY_RUN" -eq 1 && -n "$VERSION" ]]; then
  echo "Dry run note: release mode would also rewrite CHANGELOG.md from Unreleased to [$VERSION] - $(date '+%Y-%m-%d')."
  echo
fi

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

  echo
  echo "Reopening local CHANGELOG.md Unreleased section..."
  roll_changelog_after_release "$VERSION"
fi

echo
echo "Done. Latest commit:"
git --no-pager log -1 --oneline
if [[ -n "$VERSION" && "$CREATE_TAG" -eq 1 ]]; then
  echo "Tagged release: v$VERSION"
  echo "Opened local changelog section: Unreleased"
  echo "CHANGELOG.md is now modified locally for the next development cycle."
fi
