#!/usr/bin/env bash
# Bash port of generate-activity.ps1 — incremental "utility CSS" activity:
# many branches -> PR -> merge. Everything stays inside playground/.
#
# Usage: generate-activity.sh [PR_COUNT] [COMMITS_PER_PR] [START_PR] [START_COUNTER]
#   PR_COUNT       number of PR batches to create        (default 20)
#   COMMITS_PER_PR commits (utilities) per PR            (default 5)
#   START_PR       first PR batch index, for the labels  (default 1)
#   START_COUNTER  utility counter already used (u-N)    (default 0)
set -euo pipefail

PR_COUNT="${1:-20}"
COMMITS_PER_PR="${2:-5}"
START_PR="${3:-1}"
COUNTER="${4:-0}"
BASE_BRANCH="main"

palette=('#2563eb' '#16a34a' '#dc2626' '#d97706' '#7c3aed' '#0891b2' '#db2777' '#65a30d' '#ea580c' '#0d9488')

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"
dir="$repo_root/playground"

ensure_files() {
  [ -f "$dir/styles.css" ]   || printf '/* utility classes - generated incrementally */\n' > "$dir/styles.css"
  [ -f "$dir/CHANGELOG.md" ] || printf '# Changelog\n' > "$dir/CHANGELOG.md"
  [ -f "$dir/index.html" ]   || printf '<!doctype html>\n<html><head><meta charset="utf-8"><link rel="stylesheet" href="styles.css"></head>\n<body>\n<!-- boxes -->\n</body></html>\n' > "$dir/index.html"
}

add_utility() {
  local c="$1"
  ensure_files
  local color="${palette[$(( (c - 1) % ${#palette[@]} ))]}"
  printf '.u-%s { padding: %spx; border-radius: 4px; background: %s; color: #fff; }\n' "$c" "$c" "$color" >> "$dir/styles.css"
  printf -- '- u-%s: add utility (bg %s, pad %spx)\n' "$c" "$color" "$c" >> "$dir/CHANGELOG.md"
  printf '<div class="u-%s">box u-%s</div>\n' "$c" "$c" >> "$dir/index.html"
}

run_id="$(date +%Y%m%d-%H%M%S)"
end_pr=$(( START_PR + PR_COUNT - 1 ))
echo "run id: $run_id | PR ${START_PR}..${end_pr} x ${COMMITS_PER_PR} commit | start counter u-$((COUNTER + 1))"

for (( i = START_PR; i <= end_pr; i++ )); do
  branch="$(printf 'playground/%s-pr%02d' "$run_id" "$i")"

  git checkout "$BASE_BRANCH" -q
  git pull --ff-only origin "$BASE_BRANCH" -q
  git checkout -b "$branch" -q

  utils=()
  for (( j = 1; j <= COMMITS_PER_PR; j++ )); do
    COUNTER=$(( COUNTER + 1 ))
    add_utility "$COUNTER"
    git add playground
    git commit -q -m "playground: add utility u-${COUNTER} (PR ${i}, commit ${j})"
    utils+=("u-${COUNTER}")
  done

  git push -u origin "$branch" -q

  title="Playground activity batch ${i} (run ${run_id})"
  body="Auto-generated incremental utilities: $(IFS=', '; echo "${utils[*]}"). Folder: playground/ only."
  pr_url="$(gh pr create --base "$BASE_BRANCH" --head "$branch" --title "$title" --body "$body" | grep -oE 'https://github.com/\S+' | tail -1)"
  echo "  PR ${i} -> ${pr_url}"

  git checkout "$BASE_BRANCH" -q
  gh pr merge "$pr_url" --merge --delete-branch >/dev/null
  git pull --ff-only origin "$BASE_BRANCH" -q
  echo "  merged + branch deleted"
done

echo "DONE: through u-${COUNTER}, PR ${START_PR}..${end_pr}"
