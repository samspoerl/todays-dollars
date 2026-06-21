---
paths:
  - "src/**/*.tsx"
---

# Component Standards

## Placement hierarchy

1. **`src/components/ui/`** — shadcn primitives only
2. **`src/components/`** — shared components used across multiple pages
3. **`src/app/ui/`** — components specific to a single route/page

## Structure

- Props interface at the top of the file
- Named exports (not default for components)
- Order within a component:
  1. Hooks (state, refs, custom hooks, effects)
  2. Utils (computed values, helpers)
  3. Event handlers (user interactions)
  4. Render (return)
- Use inline comments to delineate sections:
  ```tsx
  // HOOKS
  // UTILS
  // EVENT HANDLERS
  ```

## Function declarations

Prefer function declarations over arrow functions for named handlers:

```tsx
// ✅
async function handleSubmit(values: FormValues) { ... }

// ❌
const handleSubmit = async (values: FormValues) => { ... }
```

Keep arrow functions for inline callbacks and anonymous functions.

## Icons

Always use Lucide icons (`lucide-react`). Always suffix the import name with `Icon`:

```tsx
import { PlayIcon, PencilIcon } from 'lucide-react'
```
