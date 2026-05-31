# Wiki Phase 1 Design — Breadcrumbs, Table of Contents, Tests

**Date:** 2026-03-31
**Phase:** 1 of 4
**Status:** Approved

---

## Context

The project wiki currently has: real-time Yjs collaboration, hierarchical page tree, versioning, comments, and issue links. It is missing features present in Nuclino and similar tools. This spec covers Phase 1 of a four-phase improvement programme.

**Planned phases:**
- **Phase 1 (this spec):** Breadcrumbs, Table of Contents (right sidebar), full test suite
- **Phase 2:** Full-text search
- **Phase 3:** Wikilinks, backlinks, graph view
- **Phase 4:** Page templates, version diff view

---

## Problem

1. **No navigation context.** Deep page hierarchies are hard to navigate — there is no way to see where a page sits in the tree without scrolling the sidebar.
2. **No document outline.** Long wiki pages have no table of contents, forcing readers to scroll to find sections.
3. **Zero test coverage.** The entire wiki module (models, views, consumer, tasks) has no tests, making future changes risky.
4. **Opaque content storage.** Wiki content is stored as `{"_yjs": hex}` — a raw Yjs binary blob. The backend cannot read headings, run search, or produce diffs. This blocks Phases 2, 3, and 4.

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| TOC position | Right sidebar (3-column layout) | Nuclino-style; always visible on wide screens |
| Ancestor resolution | Serializer computed field | No new endpoint; ancestors embedded in existing page detail response |
| Content storage | Dual-store: TipTap JSON in `content`, Yjs binary in `yjs_state` | Enables backend search (Phase 2) and version diffs (Phase 4) |
| Backend test framework | Django `TestCase` | Consistent with other apps in the project |
| Frontend test framework | Vitest + React Testing Library | Already used project-wide |
| WikiEditor test scope | Excluded from unit tests | TipTap + Yjs requires browser APIs; deferred to Playwright |

---

## Data Model Changes

### WikiPage

Add `yjs_state` field:

```python
yjs_state = models.BinaryField(null=True, blank=True)
```

The `content` JSONField now stores **only TipTap JSON** (never the `{"_yjs": hex}` format).

### WikiPageVersion

Add matching `yjs_state = models.BinaryField(null=True, blank=True)` so version snapshots also carry the Yjs state.

### Migration

1. Add `yjs_state` to both models (nullable).
2. Data migration: for existing `WikiPage` rows where `content == {"_yjs": hex}`, move the hex value to `yjs_state` and set `content = {}`.

**Note:** Pages in this format will have an empty TipTap document after migration. This is acceptable — the Yjs state is preserved in `yjs_state` and the editor will reconstruct content from it on next open. If any rows exist in a pre-Yjs format with real TipTap JSON already in `content`, they are unaffected (the migration only targets `{"_yjs": …}` keys).

---

## Backend Changes

### WikiPageDetailSerializer

Add `ancestors` SerializerMethodField:

```python
def get_ancestors(self, obj):
    chain, page = [], obj.parent
    while page:
        chain.append({"id": str(page.id), "title": page.title})
        page = page.parent
    return list(reversed(chain))
```

Returns a root-first list: `[{"id": "…", "title": "Engineering"}, {"id": "…", "title": "Backend"}]`. Empty list for root pages.

**Performance:** One DB hit per ancestor level. Typical depth is 2–4 levels. Acceptable without optimisation; can add `select_related` chain or migrate to django-mptt later without changing the API contract.

### WikiPageConsumer

**`connect()`** — send initial state as two messages:
1. JSON message: `{"type": "init", "content": page.content}` (TipTap JSON)
2. Binary message: `page.yjs_state` bytes (if set)

**`save_yjs_state` Celery task** — updated to write to `yjs_state` only:
```python
page.yjs_state = bytes.fromhex(yjs_hex)
page.save(update_fields=["yjs_state"])
```
The task must **not** modify `content`.

### WikiPageDetailView (PATCH)

`content` field now accepts and stores TipTap JSON directly. Word count is computed from TipTap JSON text nodes on the backend before saving.

---

## Frontend Changes

### WikiLayout.tsx

Restructure from 2-column to 3-column grid:

| Column | Width | Contents |
|---|---|---|
| Left | 220px fixed | PageTree (unchanged) |
| Centre | flex, max 720px | WikiBreadcrumb + WikiPage (editor) |
| Right | 180px fixed | WikiTOC |

The right TOC column is hidden (`display: none`) below 1280px viewport width (Tailwind `xl:` breakpoint). The centre column expands to fill the space.

### WikiBreadcrumb.tsx (new component)

- Reads `page.ancestors` from the `useWikiPage` hook response.
- Renders: `[Space icon + name] › [ancestor.title] › … › [current page title]`
- Each ancestor segment is a `<Link>` to that page.
- Current page title is plain text (not a link).
- Truncates middle segments with `…` when the container is too narrow (CSS `text-overflow`).
- Placed above the page title in `WikiPage.tsx`.
- Accessibility: wrapped in `<nav aria-label="Breadcrumb">` with `aria-current="page"` on the last item.

### WikiTOC.tsx (new component)

- Receives the TipTap `editor` instance as a prop.
- Extracts heading nodes (H1, H2, H3) from the editor's JSON state on every `editor.on('update')` event.
- Renders as a sticky list; H2 is indented 8px, H3 indented 16px under their parent H1/H2.
- Active heading is highlighted using `IntersectionObserver` watching each heading's DOM element. TipTap headings must carry auto-generated `id` attributes (e.g. `id="heading-overview"` slugified from text) so TOC entries can resolve their target DOM node. Add a custom `addAttributes` override to the heading extension to inject the `id`.
- Clicking a TOC entry calls `scrollIntoView({ behavior: 'smooth' })` on the target heading element.
- Component renders `null` when fewer than 3 headings are present.
- Accessibility: `<nav aria-label="Table of contents">` wrapper, headings as `<a>` links.

### WikiPage.tsx

- Passes the `editor` instance down to `WikiTOC`.
- Renders `<WikiBreadcrumb ancestors={page.ancestors} spaceId={page.spaceId} spaceName={space.name} />` above the title input.
- Save (PATCH) sends `editor.getJSON()` as the `content` payload.

### WikiEditor.tsx

- On receiving the `init` JSON message from the consumer, seed the TipTap document with `content` before the Yjs provider connects (prevents blank flash). Sequencing: initialize the TipTap editor with the TipTap JSON as `content` prop; connect the `WebsocketProvider` only after the editor is mounted. The Yjs binary received subsequently will reconcile any peer edits on top of the seeded state.
- On receiving the Yjs binary message, apply it to the `Y.Doc` as before.

---

## Tests

### Backend — `apps/wiki/tests/`

**`test_models.py`**
- WikiSpace creation: global (project=None) and project-scoped
- WikiPage parent/child hierarchy and `sort_order` midpoint
- WikiPageVersion auto-increment version number
- WikiIssueLink link type choices

**`test_views.py`**
- Space CRUD (list, create, update, delete)
- Page CRUD + move + publish/unpublish
- Page detail response includes `ancestors` field (ordered root-first)
- Ancestors is empty list for root pages
- Version list and restore
- Comment create, resolve, delete
- Private space: non-admin, non-creator gets 403
- Locked page: edit attempt returns 403
- Public page endpoint: no auth required, returns page by token

**`test_consumers.py`** (Django Channels `WebsocketCommunicator`)
- Connect sends JSON `init` message with TipTap content
- Connect sends Yjs binary message when `yjs_state` is set
- Binary message is relayed to group, not sent back to sender
- Archived page: connect rejected with close code 4003
- Unauthenticated connect: rejected

**`test_tasks.py`**
- `save_yjs_state` writes hex to `yjs_state` as bytes
- `save_yjs_state` does not modify `content` field
- `create_page_version` snapshots title and content correctly
- `create_page_version` auto-increments `version_number`

### Frontend — `features/wiki/__tests__/`

**`WikiBreadcrumb.test.tsx`**
- Renders space name and ancestor links in correct order
- Current page title is not a link
- Empty ancestors renders space name only
- `aria-current="page"` on last item

**`WikiTOC.test.tsx`**
- Renders H1/H2/H3 headings extracted from mock TipTap JSON
- H2/H3 indented relative to H1
- Returns null when fewer than 3 headings
- Click on entry calls `scrollIntoView`

**`useWiki.test.ts`**
- `useWikiPage` response includes `ancestors` array
- `useUpdateWikiPage` sends TipTap JSON in request body
- `useWikiSpaces` filters by workspace ID

---

## Out of Scope for Phase 1

- WikiEditor unit tests (requires Playwright; deferred)
- Full-text search (Phase 2)
- Wikilinks, backlinks, graph view (Phase 3)
- Page templates, version diff view (Phase 4)
- Drag-and-drop page reorder UI (exists in data model; no new UI work here)
- Emoji picker UI and cover image UI (data model fields exist; UI deferred)
