## 2024-06-20 - Adding Jest Tests for Next.js 15 App Router APIs
**Learning:** Next.js 15+ API routes receive dynamic route parameters as a Promise (e.g. `props: { params: Promise<{ id: string }> }`).
**Action:** When testing these routes with Jest, explicitly pass a resolved promise for the `params` prop (e.g. `Promise.resolve({ id: '123' })`) instead of a plain object.
