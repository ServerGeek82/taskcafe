  High — UX                                                                                                                                          
  1. Mobile responsiveness (#11) — Zero mobile support across the entire UI. Kanban board, task details modal, navigation — all desktop-only. Needs
  responsive breakpoints, mobile nav pattern, and touch-friendly interactions.                                                                       
                                                                                                                                                   
  High — Reliability                                                                                                                               
  2. Test coverage — Zero tests. Priority:
  - Go integration tests for GraphQL resolvers
  - Go unit tests for auth flow
  - Frontend component tests for login, task CRUD
  - E2E tests for registration → login → project → task flow

  Medium — Tech Debt
  3. Replace rich-markdown-editor — Abandoned since 2021, forces --legacy-peer-deps on install. Works at runtime but is the last React 16/17 holdout.
   Alternatives: @tiptap/react, @blocknote/react, milkdown.
  4. Fix 125 no-explicit-any warnings — Worst in MyTasks, Board, styled component props.
  5. Fix 285 no-unused-vars warnings — Mostly unused imports, safe to fix mechanically.
  6. Upgrade Go 1.14 in Dockerfile — Backend stage uses 6-year-old Go. Needs golang:1.21-alpine+ and go.mod version bump.

  Lower — Polish
  7. Replace react-beautiful-dnd — Deprecated by Atlassian. Drop-in replacement: @hello-pangea/dnd (same API).
  8. Remove graphql-tag package — Included in @apollo/client v3, redundant.
  9. Add loading/error states — Many pages return null while loading. Should show skeletons/spinners.
  10. Code-split the bundle — Single 3.4MB JS chunk. Lazy-load routes with React.lazy().
  11. Fix assert module warning — Vite warns about rich-markdown-editor importing Node's assert. Goes away when #3 is done.
