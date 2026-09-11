# Professional UI redesign plan

Status: design and implementation plan only. The current Phase 2 interface remains functional and unchanged until this plan is implemented.

## 1. Design direction

The product is a public-sector operational workspace used for sensitive land-record work. It should feel authoritative, calm and precise. It should not look like a marketing site, gaming interface or generic AI dashboard.

**Design read:** a regulated departmental application for administrators, operators, verification officers, GIS officers and supervisors, using a trust-first enterprise visual language with restrained animation.

| Design control | Value | Reason |
|---|---:|---|
| Design variance | 4/10 | Clear hierarchy with a few asymmetric dashboard compositions |
| Motion intensity | 3/10 | Motion explains change and progress without distracting from records |
| Visual density | 6/10 | Efficient daily work with comfortable reading and touch targets |

The redesign is a targeted evolution. Preserve route paths, permissions, field names, workflow behavior, data contracts and server-side authorization. Replace the visual system, shell and page composition without changing the meaning of existing actions.

### Visual character

- **Primary mood:** institutional clarity, modern administration and document-focused work.
- **Palette:** deep ink/navy surfaces, cool neutral backgrounds and one restrained emerald accent. Amber, red and blue appear only as semantic warning, error and information colors.
- **Typography:** Geist Sans for interface copy and Geist Mono for IDs, hashes, timestamps and numeric metrics, loaded through `next/font`.
- **Shape system:** 12px surfaces, 8px controls and fully rounded status chips only. This rule remains consistent across the product.
- **Elevation:** mostly borders and surface contrast. Shadows are limited to navigation overlays, dialogs and selected floating panels.
- **Icon system:** Phosphor Icons only, using `@phosphor-icons/react`, regular weight at 18-20px and 1.5px-equivalent visual weight. No emoji, hand-built SVG icon paths or mixed icon families.
- **Theme:** light and dark modes using semantic CSS variables. The default follows the operating-system preference and persists an explicit user choice.

## 2. Component strategy

Magic UI and React Bits provide presentation and motion patterns. They are not the accessibility foundation for complex forms, dialogs, menus and tables. Use owned shadcn/Radix primitives for those controls, then apply the project tokens. This keeps keyboard, focus and screen-reader behavior dependable while satisfying the requested visual direction.

Third-party packages are not currently installed. Verify versions and licenses immediately before implementation, then add only the components used. Magic UI components are copied into the repository through its registry; React Bits components are copied or installed according to its current official instructions. Do not add a broad component bundle.

### Approved component allocation

| Need | Foundation | Enhancement | Where it is used |
|---|---|---|---|
| Application shell | Radix/shadcn navigation primitives | React Bits Sidebar motion pattern, adapted | Desktop sidebar and mobile sheet |
| Dashboard composition | CSS Grid and semantic sections | Magic UI Bento Grid | Role-aware overview layout |
| Metric transitions | Accessible text with stable fallback | React Bits Count Up | Real server-provided counts only |
| Section entrance | Static Server Component markup | React Bits Animated Content | One-time content reveal after navigation |
| Activity stream | Semantic ordered list | Magic UI Animated List | Recent real audit/document activity |
| Upload workflow | Native form and Radix controls | React Bits Stepper | Select files, classify, confirm and upload |
| Upload progress | Native `progress` semantics | Magic UI progress treatment | Per-file validation and transfer status |
| Processing status | Status text and timeline | Magic UI Animated Circular Progress | Future Phase 3 jobs only |
| Model/system relationship | Static diagram fallback | Magic UI Animated Beam | Future admin integration health view only |
| Focused success moment | Inline success panel | React Bits Animated Content | Completed upload or saved revision |
| Buttons and controls | shadcn/Radix owned code | CSS transform/opacity feedback | All pages |
| Data tables | Semantic table; TanStack Table if needed | Row entrance only on first load | Documents, users and audit |
| Icons | Phosphor Icons | No additional icon library | Navigation, buttons, states and empty views |

### Components that should not be used

- Confetti, sparkles, meteors, particles, custom cursors, glowing text and decorative marquees.
- Continually moving background effects behind operational content.
- Glass surfaces on dense forms and tables.
- Hover effects that hide essential actions or information.
- Animated numbers for percentages that have no measured denominator.
- Decorative progress charts for unimplemented OCR, validation or approval states.
- Magic Card or Spotlight Card effects on every surface. If used at all, limit them to one low-motion dashboard callout.

Official references: [Magic UI components](https://magicui.design/docs/components), [Magic UI Bento Grid](https://magicui.design/docs/components/bento-grid), [Magic UI Number Ticker](https://magicui.design/docs/components/number-ticker), [React Bits component index](https://reactbits.dev/get-started/index), [React Bits Animated Content](https://reactbits.dev/animations/animated-content), [React Bits Count Up](https://reactbits.dev/text-animations/count-up), and [React Bits Stepper](https://reactbits.dev/components/stepper).

## 3. Design tokens

Use semantic names so future branding changes do not require component rewrites.

### Color tokens

| Token | Light mode purpose | Dark mode purpose |
|---|---|---|
| `--background` | Cool off-white workspace | Deep charcoal-navy workspace |
| `--surface` | Primary content surface | Raised dark surface |
| `--surface-subtle` | Filters, grouped fields and table headers | Quiet grouped surface |
| `--foreground` | Primary ink text | Warm off-white text |
| `--muted-foreground` | Secondary labels and metadata | Muted cool-gray text |
| `--primary` | Deep institutional navy | Light desaturated blue-gray |
| `--accent` | Restrained emerald | Brighter accessible emerald |
| `--border` | Cool gray divider | Dark elevated divider |
| `--success` | Completed and valid | Completed and valid |
| `--warning` | Attention required | Attention required |
| `--danger` | Destructive/error state | Destructive/error state |
| `--info` | Informational state | Informational state |

Do not use semantic status colors as decoration. Status meaning must also be conveyed by text and icon.

### Spacing and dimensions

- Base spacing unit: 4px.
- Page gutters: 24px desktop, 20px tablet, 16px mobile.
- Content maximum width: 1440px.
- Sidebar: 264px expanded and 76px collapsed.
- Top bar: 64px desktop and 60px mobile.
- Control height: 40px default and 44px on touch layouts.
- Dense table rows: 52px minimum; document rows: 64px minimum.
- Main content section gap: 24px; internal panel gap: 16px.

### Type scale

| Role | Desktop | Mobile |
|---|---:|---:|
| Page title | 30/36px, 650 | 26/32px, 650 |
| Section title | 20/28px, 600 | 18/26px, 600 |
| Metric | 30/36px, 650 mono numerals | 26/32px |
| Body | 14/22px | 14/21px |
| Label | 13/18px, 600 | 13/18px |
| Metadata | 12/18px | 12/18px |

## 4. Application shell

### Desktop

The left sidebar contains the project mark, role-aware navigation and a compact user/account area. Navigation is grouped by task:

1. **Workspace:** Overview, Documents and Upload.
2. **Review:** Processing, Verification and Records when those modules exist.
3. **Spatial:** Map when implemented.
4. **Administration:** Users, Areas, Document Types and Audit, shown by permission.

Each item uses a Phosphor icon and text. The active item uses a solid surface, left inset indicator and `aria-current="page"`. Collapsing preserves icon tooltips and keyboard access. The sidebar never auto-collapses during a task.

The top bar contains breadcrumbs, an optional page-level search trigger, notification placeholder only when a notification system exists, theme control and user menu. Do not show inactive controls for future features.

### Mobile and tablet

- Replace the sidebar with a menu button and full-height Radix Sheet.
- Keep the current page title in the top bar.
- Place primary actions in a sticky bottom action area only on form-heavy pages.
- Tables become labeled record cards below 768px; do not rely on horizontal scrolling for primary work.
- Document preview and metadata panels stack in source-first order.

### Navigation icon map

| Item | Phosphor icon |
|---|---|
| Overview | `SquaresFour` |
| Documents | `Files` |
| Upload | `CloudArrowUp` |
| Processing | `Cpu` |
| Verification | `SealCheck` |
| Records | `Archive` |
| Map | `MapTrifold` |
| Users | `UsersThree` |
| Areas | `MapPinArea` |
| Document Types | `TreeStructure` |
| Audit | `ClockCounterClockwise` |
| Search | `MagnifyingGlass` |
| Theme | `Sun` / `Moon` |
| Sign out | `SignOut` |

## 5. Dashboard plan

The dashboard is role-aware. It should answer three questions immediately: **what needs attention, what changed, and what can this user do next?** Never render fake OCR accuracy, invented processing counts or placeholder charts.

### Shared dashboard structure

```text
┌──────────────────────────────────────────────────────────────────┐
│ Greeting and scope                         Primary role action    │
├──────────────────────────────────────────────────────────────────┤
│ Metric: documents │ Metric: recent intake │ Access/scope summary │
├─────────────────────────────────────┬────────────────────────────┤
│ Attention queue / next work         │ Recent activity           │
│ Wide operational panel              │ Animated real-event list  │
├─────────────────────────────────────┴────────────────────────────┤
│ Workflow status / capability notice                              │
└──────────────────────────────────────────────────────────────────┘
```

Use a Magic UI Bento Grid adapted to an operational layout: one wide attention cell, two compact real metric cells, one scope cell and one activity cell. Cards have varied spans because their information value differs. Mobile collapses to a single column in this order: primary action, attention, metrics, scope, activity.

### Current Phase 2 dashboard

Only show data that exists:

- Documents visible in the user's scope.
- Documents uploaded by the operator.
- Recent document and access activity permitted by audit policy.
- Assigned department, role and jurisdictions.
- Short capability notice: documents are ready for model processing once Phase 3 is connected.

If an aggregate service does not yet exist, add a scoped server service and API contract before adding the metric. Do not compute sensitive totals in the browser.

### Role-specific dashboards

| Role | Primary view | Primary action | Future additions |
|---|---|---|---|
| Administrator | Configuration health, recent access changes and document intake | Manage users or document schemas | Model integration status and policy health |
| Operator | Own recent uploads, failures and incomplete intake | Upload documents | Processing jobs needing retry or metadata correction |
| Verification Officer | Source documents available in scope | Browse documents | Assigned review queue, blockers and returned cases |
| GIS Officer | Source documents and assigned jurisdictions | Browse documents | Unlinked records and parcel-review queue |
| Supervisor | Scoped totals and recent activity | Review documents/audit | Throughput, ageing, validation status and measured quality |

Future metric labels must distinguish confidence, measured accuracy and workflow completion. Accuracy appears only with a named evaluation dataset, model version, sample size and denominator.

### Dashboard motion

- Page sections enter once with React Bits Animated Content: opacity 0 to 1 and translateY 8px to 0 over 220ms.
- Metric values use React Bits Count Up only after real data arrives; screen readers receive the final value without intermediate announcements.
- Recent activity uses Magic UI Animated List once per load, with 50ms stagger and no loop.
- Cards lift 1px on hover only when clickable. Static metrics do not move on hover.
- Route changes use a 150ms opacity transition on the content region; sidebar and top bar remain stable.
- With reduced motion, all content renders immediately and numeric values do not count.

## 6. Screen-by-screen redesign

### Login

- Two-column desktop layout: concise project context and trust statement on the left, sign-in card on the right.
- Use a real application/document screenshot after the dashboard redesign, not a fabricated preview.
- Fields keep visible labels, password reveal control and inline validation.
- Phosphor icons: `IdentificationCard`, `EnvelopeSimple`, `LockKey`, `Eye`, `EyeSlash`.
- One React Bits Animated Content entrance for the sign-in panel. No animated background.
- Mobile shows the brand header followed immediately by the form.

### Documents list

- Header: title, result count and permitted Upload action.
- Sticky filter bar: search, village, document type and a clear-filters action.
- Desktop uses a semantic table with title/ID, location, type/schema, uploader/date and status.
- Mobile uses document result cards with the same information and one clear Open action.
- Add selected-row and keyboard-focus treatments. Do not animate row reorder or pagination.
- Empty state uses `Files` and a direct Upload action for operators; readers receive an explanation of scope/filter conditions.
- Loading uses table-shaped skeleton rows matching final dimensions.

### Upload documents

- Convert the long single form into a four-part React Bits Stepper:
  1. **Select files** - drag/drop and file picker.
  2. **Classify** - administrative hierarchy and document type.
  3. **Describe** - language, reference, notes and per-file title review.
  4. **Confirm and upload** - summary, limits and final action.
- Maintain one request and idempotency key per file.
- Show each file as a row with `FilePdf`, `FileImage`, size, validation status and remove action.
- Progress states: waiting, uploading, inspecting, saved and failed. Every state uses text and an icon; color is supplemental.
- Failed items retain their metadata and offer a Retry action using the same key.
- Use animation only for step transition, row insertion/removal and progress changes. The upload button does not shimmer continuously.

### Document detail and viewer

- Desktop split: source viewer 65%, record context 35%. Allow the metadata panel to collapse so the viewer can use more width.
- Sticky viewer toolbar: previous/next page, page number, zoom, rotate-view control if implemented, fit-width and download.
- Tabs in the context pane: Details, Metadata History and Status History.
- Show immutable source facts separately from editable descriptive metadata.
- Use `FileLock`, `Hash`, `MapPin`, `Tag`, `ClockCounterClockwise` and `DownloadSimple` icons.
- Preserve the PDF canvas and private image endpoint. Viewer motion is limited to 120ms page opacity transition.
- On mobile: viewer first, toolbar wraps into two rows, details follow, edit action remains visible without covering content.

### Users and access

- Summary strip: active users, inactive users and role distribution only if backed by scoped service data.
- Desktop table with user, role, jurisdiction, status and actions. Mobile record cards.
- Create and edit use a Radix Dialog on desktop and full-screen Sheet on mobile.
- Scope selection uses searchable checkboxes grouped by state/district once the hierarchy relationship is available.
- Deactivation displays a clear session-revocation consequence before save.
- Icon set: `UserPlus`, `UserCircle`, `ShieldCheck`, `MapPin`, `Prohibit`.

### Administrative areas

- Replace the long hierarchy dump with a master-detail layout.
- Left pane: searchable tree for state, district, tehsil and village.
- Right pane: selected area details and Add Child action.
- Breadcrumbs show the selected hierarchy path.
- Use disclosure animation only when tree branches open or close.
- Mobile uses sequential screens: hierarchy list, selected-area detail, create form.
- Icon set: `MapPinArea`, `MapTrifold`, `Buildings`, `HouseLine`, `Plus`.

### Document types

- Left rail lists document types with current version and field count.
- Main workspace contains schema header, version history, structured field builder and publish action.
- Field rows support drag handles only if accessible keyboard reordering is implemented; otherwise use Move Up/Down controls.
- Required and critical use checkboxes plus visible text labels.
- A schema comparison view highlights added, changed and removed fields before publishing.
- Existing-document impact notice states that older uploads retain their pinned version.
- Icon set: `TreeStructure`, `Rows`, `GitDiff`, `LockSimple`, `UploadSimple`.

### Audit history

- Filter drawer: action, actor, entity and date range when supported by the API. Hide unsupported filters.
- Timeline/table toggle: table is default for scanning; timeline is useful for one selected entity.
- Event rows show action label, actor, target, timestamp and expandable details.
- Use monospace for request/entity IDs and a Copy button with non-intrusive confirmation.
- No Animated List here; audit review benefits from stable row positions.
- Icon set: `ClockCounterClockwise`, `FunnelSimple`, `Copy`, `CaretDown`.

### Error, loading and empty states

Every route must have page-specific loading, empty and error states:

- Skeleton shapes mirror the target layout and reserve final space.
- Inline field errors sit below the relevant control and link through `aria-describedby`.
- Page failures keep navigation available and show a retry action plus request ID.
- Empty states explain whether the cause is no data, filters or insufficient scope.
- Permission failures do not reveal whether an inaccessible record exists.

## 7. Future workflow screens

Design these now as contracts, but do not place inactive navigation items in the current product.

### Processing center

- Queue table with status, stage, elapsed time, attempts and actionable failure.
- Detail drawer shows application job ID, model profile/version, input hash and event timeline.
- Magic UI Animated Circular Progress is allowed only for a known current stage with a real bounded percentage. Otherwise use an indeterminate status label and elapsed time.
- Retry, cancel and reconcile actions require explicit permissions and reasons.

### Verification workspace

- Source viewer on the left and structured field review on the right.
- Each field shows candidate value, confidence, evidence location, validation findings and decision.
- Keyboard shortcuts require visible documentation and must not override browser conventions.
- Sticky decision footer: Save Draft, Return and Approve. Approval is visually distinct and requires exact-revision confirmation.

### Records and search

- Filtered results with owner, survey/khasra/khata, village, type and approval version.
- Record detail emphasizes current approved snapshot and exposes version history separately.
- Never mix draft extraction values into approved search results without an explicit draft label.

### GIS workspace

- Map canvas with a collapsible results/record panel.
- Geometry source, CRS, provenance and link-review state remain visible.
- Use color-safe map states plus patterns or line styles. Missing geometry has an explicit non-map state.

### Supervisor dashboard

- Scoped workload, age distribution and throughput.
- Validation outcome and measured quality only with denominators.
- State/district drill-down and date filters persist in the URL.
- Charts use stable, accessible data visualization components, not decorative Magic UI effects.

## 8. Motion system

Motion must communicate hierarchy, feedback, progress or spatial continuity.

| Motion token | Duration | Use |
|---|---:|---|
| `--motion-instant` | 100ms | Press and focus feedback |
| `--motion-fast` | 150ms | Tooltip, menu and row state |
| `--motion-base` | 220ms | Panel and step transitions |
| `--motion-slow` | 320ms | Dialog/sheet entrance and major layout transition |

Use an ease-out curve close to `[0.16, 1, 0.3, 1]` for entrances and standard ease-in for exits. Animate only opacity and transform. Avoid JS scroll listeners and React state for continuous motion.

### Required reduced-motion behavior

- Respect `prefers-reduced-motion` in React Bits, Magic UI, Motion and CSS.
- Remove count-up, stagger, beam, shimmer and parallax effects.
- Keep progress information available as text and native semantics.
- Collapse route and panel transitions to instant state changes.
- Never make animation the only indicator of selection, progress or completion.

## 9. Accessibility and usability requirements

- WCAG 2.2 AA target for all implemented pages.
- Full keyboard operation for navigation, dialogs, menus, filters, tables, steppers and tree views.
- Visible 3px focus indicator with sufficient contrast.
- Minimum 44x44px touch target on mobile.
- Landmark structure, skip link, unique page title and logical heading order.
- Accessible names for icon-only controls and decorative icons marked `aria-hidden`.
- Live regions reserved for meaningful upload/save results; do not announce animated number frames.
- Form labels remain visible. Placeholder text never replaces a label.
- Status uses icon, text and color. Charts include summaries or tables.
- Preserve the current privacy behavior: private/no-store pages and no sensitive data in decorative client components.

## 10. Responsive behavior

| Width | Shell | Main adaptations |
|---|---|---|
| 1280px+ | Expanded sidebar | Full dashboard bento, split viewer and dense tables |
| 1024-1279px | Collapsible sidebar | Two-column dashboard; narrower detail pane |
| 768-1023px | Icon rail or mobile sheet | Stacked dashboard groups; tables simplify columns |
| Below 768px | Mobile top bar and navigation sheet | Single-column pages, record cards, full-screen forms |

Do not use viewport-height locks for page content. Use `min-height: 100dvh`, safe-area padding and sticky controls that do not cover inputs or document content.

## 11. State and data rules

- Server Components fetch initial authorized data. Client components handle bounded interaction only.
- Dashboard data comes from one scoped aggregate service to avoid inconsistent counts.
- URL search parameters own list filters, pagination, sorting and drill-down state.
- Never ship sample dashboard values in production components. Storybook/test fixtures remain explicitly synthetic.
- Do not expose database rows, storage keys, session data or model credentials to animation components.
- Optimistic updates are appropriate for local display preferences, not document status, schema publication, access changes or approval.

## 12. Proposed code organization

```text
src/
  components/
    ui/                    Owned Radix/shadcn primitives
    magicui/               Selected and customized Magic UI source
    react-bits/            Selected and customized React Bits source
    icons/                 Phosphor wrappers and size/weight policy
  design-system/
    tokens.css
    motion.ts
    icon-map.ts
  app/
    (workspace)/
      _components/
        app-shell.tsx
        sidebar.tsx
        mobile-navigation.tsx
        topbar.tsx
        page-header.tsx
  modules/
    dashboard/
      contracts/
      server/
      ui/
    documents/ui/
    identity/ui/
    master-data/ui/
    document-types/ui/
    audit/ui/
```

Third-party source copied into `components/magicui` or `components/react-bits` must be reviewed, reduced to the required behavior and styled exclusively with project tokens. Motion-heavy files are isolated Client Components. Layout and data fetching remain Server Components.

## 13. Implementation sequence

### Foundation

1. Add semantic color, type, spacing, radius, elevation and motion tokens.
2. Add Geist through `next/font`, Phosphor Icons and the accessible UI primitives required by existing pages.
3. Add theme and reduced-motion support.
4. Build Storybook or a local component showcase for controls, states and responsive review.

### Shell and shared patterns

1. Implement the responsive application shell, navigation and page header.
2. Build buttons, inputs, selects, badges, alerts, dialogs, sheets, tabs, skeletons and empty states.
3. Add selected Magic UI and React Bits components only after the static component works.
4. Preserve every current route and permission condition.

### Current pages

1. Dashboard with real scoped aggregates.
2. Documents list and document viewer.
3. Upload stepper with existing idempotent behavior.
4. Users, administrative areas and document types.
5. Audit, login and global error/loading states.

### Validation and future readiness

1. Test all roles at desktop, tablet and mobile widths.
2. Test keyboard-only use, screen reader labels and reduced motion.
3. Run visual regression tests in light and dark modes.
4. Measure bundle size and lazy-load non-critical animation code.
5. Run Lighthouse and verify LCP below 2.5s, INP below 200ms and CLS below 0.1 on representative hardware.
6. Add future processing, verification, records, GIS and supervisor screens only with their backing services.

## 14. Acceptance checklist

The redesign is complete only when all items pass:

- Existing Phase 1 and Phase 2 functionality and automated tests remain green.
- Every existing URL, form contract, permission gate and audit behavior is preserved.
- No emoji or hand-drawn SVG icons appear in application UI.
- Phosphor is the only icon family and icon-only controls have accessible names.
- Magic UI and React Bits effects are customized, purposeful and reduced-motion safe.
- No dashboard metric uses mock, estimated or inaccessible cross-scope data.
- Every page has loading, empty, error, success, disabled and permission states.
- Desktop, tablet and mobile layouts have no unintended horizontal overflow.
- Light and dark themes pass contrast review.
- Keyboard navigation reaches all controls in a logical order.
- Forms preserve values after validation errors; interrupted uploads remain safely retryable.
- Animations use transform/opacity, clean up correctly and do not delay core actions.
- Server-only data and secrets remain outside client bundles.
- Visual regression, integration, browser, type, lint, build and client-secret checks pass.

## 15. Explicit non-goals for the redesign

- Do not implement OCR jobs, model calls, approval, GIS or analytics merely to populate screens.
- Do not change business permissions or database behavior as a visual redesign shortcut.
- Do not display model accuracy until it is measured on a versioned, representative dataset.
- Do not add decorative animation to audit, legal or confirmation content.
- Do not use Magic UI or React Bits components just because they are available.

The UI redesign should make the existing system easier to understand and operate while creating a consistent foundation for future workflow modules.
