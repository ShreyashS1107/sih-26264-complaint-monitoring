# Team Git Workflow & Engineering Practices

**Project:** Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells  
**Problem Statement ID:** SIH 26264  
**Team:** Matrix Maya

---

## 1. Core Principles

To ensure collaboration remains clean, traceable, and conflict-free across all team members, all development must adhere to the following conventions:

1. **Feature Branching:** Never commit directly to `main`. Every enhancement, bugfix, or architectural update must be developed on an isolated branch.
2. **Atomic, Descriptive Commits:** Commit often with small, logical units of work that can be easily understood and rolled back if necessary.
3. **Pre-Commit Verification:** Run relevant test suites, type checking, and linter rules locally before committing or pushing changes.
4. **Clean Workspace Discipline:** Keep branches synchronized with `main` to prevent stale histories and painful merge conflicts.
5. **No Secrets or Credentials:** Never stage or commit `.env` files, API keys, private tokens, or sensitive institution data.
6. **No Force-Pushing on Shared Branches:** Under no circumstances should `git push --force` or `--force-with-lease` be executed against `main` or any shared team branch.

---

## 2. Branch Naming Conventions

All branch names must follow the format `<type>/<short-kebab-description>`:

| Branch Prefix | Purpose                                       | Example                               |
| :------------ | :-------------------------------------------- | :------------------------------------ |
| `feat/`       | New module, feature, or engine capability     | `feat/overlap-scoring-algorithm`      |
| `fix/`        | Bug fixes and defect resolutions              | `fix/institution-id-normalization`    |
| `docs/`       | Documentation additions or updates            | `docs/architecture-diagram-update`    |
| `refactor/`   | Code refactoring without behavioral change    | `refactor/modularize-bureau-adapters` |
| `test/`       | Adding or updating unit/integration tests     | `test/add-overlap-engine-fixtures`    |
| `chore/`      | Tooling, dependencies, or configuration tasks | `chore/setup-prisma-schema`           |

---

## 3. Commit Message Standards

We use the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<optional scope>): <short description in present tense>

[optional body explaining motivation and architectural context]

[optional footer(s) referencing issue / task]
```

### Commit Types

- `feat`: A new feature or capability.
- `fix`: A bug fix.
- `docs`: Documentation updates.
- `style`: Code style, formatting (no functional change).
- `refactor`: Refactoring production code.
- `test`: Adding or correcting tests.
- `chore`: Scaffolding, build configuration, package updates.

### Examples

- `feat(overlap): implement TF-IDF lexical match scoring`
- `fix(institutions): handle hyphenated AICTE permanent IDs correctly`
- `docs(git): document branch policies and pull request requirements`
- `chore: initialize SIH 26264 project structure`

---

## 4. Step-by-Step Development Workflow

### Step 1: Update Local Main Branch

Before branching out, fetch and sync the latest state:

```bash
git checkout main
git pull origin main
```

### Step 2: Create a Dedicated Feature Branch

```bash
git checkout -b feat/institution-search-resolver
```

### Step 3: Implement, Test, and Verify

Work within the module boundaries (`src/modules/...`). Run tests continuously:

```bash
# Verify linting, typing, and tests (when configured in future phases)
npm run lint
npm run test
```

### Step 4: Stage & Commit Mindfully

Inspect your changes before staging:

```bash
git status
git diff
git add <specific-files>
git commit -m "feat(institutions): add fuzzy search helper for unlisted colleges"
```

### Step 5: Push and Open a Pull Request

Push the feature branch to GitHub:

```bash
git push -u origin feat/institution-search-resolver
```

- Open a Pull Request against `main`.
- Fill in the PR summary describing what changes were made, testing steps verified, and any dependencies.
- Request review from at least one peer before merging.

---

## 5. Security & Secret Safeguards

- Verify `.gitignore` is respected before staging files.
- If you accidentally stage a file containing credentials or sensitive data:
  ```bash
  git reset HEAD <path-to-file>
  ```
- If an environment file was committed locally but not pushed:
  ```bash
  git rm --cached <path-to-file>
  git commit --amend
  ```
- All test fixtures must use synthetic data only.
