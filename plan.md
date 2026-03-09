# Refactor Project Comments

Refactor all comments in the project to follow a consistent commenting standard by removing all existing comments and introducing new comments only where they add meaningful context.

---

# Scope

The refactor applies to all source files inside:

- `src/**`

Applicable file types include:

- `.ts`
- `.tsx`
- `.js`
- `.jsx`

Configuration files, generated files, and dependencies must **NOT** be modified:

- `node_modules/**`
- `dist/**`
- `build/**`
- `generated/**`
- `.next/**`
- `scripts/**`
- `sources/**`

---

# Refactor Workflow

For each file in scope:

### Step 1 — Remove Existing Comments

Remove all existing comments including:

- Single-line comments
  `// comment`

- Multi-line comments
  `/* comment */`

- JSDoc comments
  `/** comment */`

This includes:

- Header comments
- Inline comments
- Block comments
- JSDoc documentation

---

### Step 2 — Analyze Code Logic

Before adding new comments, analyze the file and identify:

- Business logic
- Critical workflows
- Non-obvious behavior
- Side effects
- Important constraints

Avoid adding comments before understanding the logic.

---

### Step 3 — Add New Comments

Add new comments using **only**:

- `//`
- `/* */`

**Do NOT use JSDoc style comments (`/** \*/`).\*\*

---

# Commenting Rules

## 1. Business Logic

Add comments when code implements domain logic.

Example:

```ts
// Update donation status after verifying the transaction from the payment provider
```

---

## 2. Non-Obvious Behavior

Explain logic that may be confusing to future maintainers.

Example:

```ts
// Skip duplicate transactions to prevent double-processing donations
```

---

## 3. Important Constraints

Document assumptions or required conditions.

Example:

```ts
// This method must only be called after the guild configuration has been loaded
```

---

## 4. Side Effects

Document operations that change external state.

Example:

```ts
// Persist donation status update to the database
```

---

## 5. Critical Application Flow

Explain important flows such as:

- Payment verification
- Donation lifecycle
- Queue processing
- Event handling
- Background jobs

Example:

```ts
// Main flow: validate donation → verify payment → update status → notify Discord
```

---

## 6. Important Functions

Important functions should have a short description above them.

Example:

```ts
// Handle payment confirmation from the payment provider
async function handleDonationConfirmation() {}
```

---

# Do NOT Comment

Avoid comments for code that is already self-explanatory.

Examples:

- Simple getters/setters
- Basic CRUD repository methods
- Trivial utility functions
- Simple condition checks
- Straightforward loops or mapping operations

Example of **bad comment**:

```ts
// Increment counter
counter++
```

---

# Comment Style Guidelines

- Prefer placing comments **above the logic block** rather than inline.
- Keep comments concise (1–2 lines).
- Avoid redundant explanations.
- Use clear technical language.
- Maintain consistent tone across the codebase.

---

# Verification Plan

## Automated Verification

1. Run build to ensure no syntax errors:

```
npm run build
```

2. Run existing tests to confirm logic is unchanged:

```
npm test
```

3. Run linter (if available):

```
npm run lint
```

---

## Manual Verification

1. Review a sample of files from different layers:

- handlers
- services
- repositories
- helpers
- utilities

2. Ensure comments:

- Explain intent rather than syntax
- Follow the defined style
- Appear only where meaningful

3. Verify that no JSDoc comments remain in the project.

---

# Acceptance Criteria

The refactor is complete when:

- All existing comments have been removed.
- New comments follow the defined standard.
- Only meaningful logic is documented.
- JSDoc comments are not present.
- Code compiles successfully.
- Tests pass without modification.
