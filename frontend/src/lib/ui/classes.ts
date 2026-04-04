/**
 * UI class primitives for the soft / glass theme (`html[data-theme="soft"]` in app.css).
 *
 * Inventory — repeated Tailwind clusters and where they live:
 * | Cluster | tailwind.config | this module |
 * | Text input + green focus (solid on frosted overlays) | — | `inputGlass`, `inputGlassSearch`, `inputGlassDisabled`, `textareaInsideFrostedPanel`, `inputGlassDense`, `textareaObjectForm`, `searchBarInput`, `defaultValueComboShell`, `inputValidatorControl`, `inputValidatorSearch`, `inputObjectMemberSearch` |
 * | Segmented toggles (drawer / API generator) | — | `segmentFieldBase`, `segmentFieldBaseJoin`, `segmentFieldInactive`, `segmentFieldActive`, `segmentPillBase`, `segmentPillSelected`, `segmentPillUnselected`, `segmentPillUnselectedLocked` |
 * | API generator 34px row controls | — | `apiGeneratorRowInputMono`, `apiGeneratorRowSelect`, `apiGeneratorHintCell` |
 * | Modal form controls | — | `modalFormCheckbox`, `modalFormRadio` |
 * | Autocomplete / dropdown panels (solid; parent drawer is already frosted) | — | `dropdownPanel`, `dropdownPanelMessage` |
 * | Query params / pagination rows | — | `queryParamReadonlyCell`, `queryParamPaginationToggle*` |
 * | Dashboard & stat cards | `boxShadow.glow-*` | `cardGlassSurface`, `cardGlassBorder*` |
 * | Green accent icon tiles | `glow-green-icon`, `glow-green-sm` | `accentIconTile`, `marketingFeatureIcon` |
 * | Sidebar shell & nav items | — | `sidebarShell`, `sidebarNavItem*` |
 * | Dashboard column shell & page header chrome | — | `dashboardMainColumn`, `dashboardMainColumnCanvas`, `dashboardMainColumnCanvasForPath`, `dashboardGreenWashGradient`, `dashboardTextPrimary`, `dashboardControlTextMutedHoverPrimary`, `backNavButton`, `dashboardPageHeaderShell`, `dashboardSearchToolbarShell`, `mainColumnChromePaddingX`, `dashboardPageHeaderTitleBand`, `dashboardPageTitleText`, `dashboardPageTitleTextDetail`, `drawerHeaderTitleText`, `headerMetaSeparator`, `headerNamespaceCluster` |
 * | Dashboard entity list tables | — | `tableListPageGutter`, `tableListCardShell`, `tableListBodyDivide`, `tableListCell`, `tableListCellPrimary`, `tableListHeaderSortable`, `tableListBodyPrimary`, `tableListBodyCell`, `tableListBodyCaption`, `tableListBodyLink`, `tableListAuxiliaryLabel`, `tableListDetailTitle`, `tableListPanelSectionTitle`, `tableListPanelStatLabel`, `tableListPanelStatTotal`, `tableListRowInteractive`, `tableListRowHover`, `tableListRowSelected` |
 * | Drawer & modal frosted shells | `drawer-deep` | `drawerPanelGlassSurface`, `modalPanelGlassSurface`, `drawerPanelFlexibleOuter`, `drawerPanelFlexibleInner`, `drawerPanelStackedOuter`, `drawerPanelStackedInner`, `drawerFooterShellInset`, `drawerFooterShellEdge`, `drawerScrim`, `drawerLinkedEntityRow`, … |
 * | Primary / secondary / destructive | `glow-green` | `drawerFooterSegmentedPanel`, `drawerFooterSegmentBtn`, `drawerFooterDeleteConfirmBanner`, `drawerFooterBtnDangerConfirmSegment*`, `drawerFooterBtnPrimary*`, `drawerFooterBtnSecondarySegment*`, `drawerFooterBtnDestructive*`, `drawerFooterDangerCallout`, `drawerFooterBtnDangerConfirm*`, `modalFooterBtn*`, `btnCtaGlow`, … |
 * | Marketing landing | `glow-*` | `marketingCtaPrimary` (nav), `marketingHeroCta` + `marketingHeroCtaSecondary`, `marketingFooterCta` + `marketingFooterCtaSecondary`, `marketingHowItWorks*` |
 * | Clerk `appearance.elements` | `glow-green`, `drawer-deep` | `clerkCard`, `clerkModalContentShell`, `clerkUserButtonPopover*`, `clerkFormButtonPrimary`, … |
 */

/** Primary foreground on dashboard dark / glass (`mono-100` chroma — use exports in components, not raw `text-white`). */
const textPrimaryOnDark = 'text-mono-100';

const hoverTextPrimaryOnDark = 'hover:text-mono-100';

/** Import in Svelte for primary copy on dark surfaces (lists, labels, frosted panels). */
export const dashboardTextPrimary = textPrimaryOnDark;

/**
 * Muted control label that brightens to {@link dashboardTextPrimary} on hover
 * (filter toggles, checklist actions, inline text buttons).
 */
export const dashboardControlTextMutedHoverPrimary = `text-mono-300 ${hoverTextPrimaryOnDark} transition-colors`;

/**
 * Square icon control for “back” in page title rows ({@link BackNavButton}).
 * Pair with `fa-arrow-left` at `text-sm` (see layout `BackNavButton.svelte`).
 */
export const backNavButton = `inline-flex items-center justify-center w-8 h-8 border border-mono-600/50 rounded-lg text-mono-400 hover:bg-mono-800/50 ${hoverTextPrimaryOnDark} transition-colors shrink-0`;

// --- Form inputs (solid fills: avoid nested backdrop-filter inside frosted drawer/modal shells) ---

const inputGlassCore = `px-3 py-1.5 border border-mono-700/80 rounded-xl bg-mono-900/80 ${textPrimaryOnDark} focus:ring-2 focus:ring-green-400/50 outline-none focus:outline-none transition-colors text-sm`;

/** Standard search/select text field (add `inputGlassSearchSuffix` when a search icon sits on the right). */
export const inputGlass = `w-full ${inputGlassCore}`;

/** Same surface as {@link inputGlass} without full width (e.g. native `<select>` in a flex row). */
export const inputGlassAuto = inputGlassCore;

export const inputGlassSearchSuffix = 'pr-8';

export const inputGlassSearch = `${inputGlass} ${inputGlassSearchSuffix}`;

/**
 * Dashboard list search field (`SearchBar`): leading icon slot via `pl-10`, solid fill for frosted canvas.
 */
export const searchBarInput = `w-full pl-10 pr-4 py-2 text-sm font-inter border border-mono-700/80 rounded-xl bg-mono-900/80 ${textPrimaryOnDark} focus:ring-2 focus:ring-green-400 focus:outline-none focus:border-transparent placeholder:text-mono-500 shadow-inner transition-colors`;

/**
 * Compact text field embedded in flex rows (e.g. constraint value beside chips).
 */
export const inputGlassDense = `flex-1 min-w-0 px-2 py-1 rounded-xl border border-mono-700/80 text-sm bg-mono-900/80 ${textPrimaryOnDark} focus:ring-2 focus:ring-green-400/50 outline-none focus:outline-none transition-colors`;

/**
 * Object drawer: description textarea uses slightly taller padding than {@link textareaInsideFrostedPanel}.
 */
export const textareaObjectForm = `w-full px-3 py-2 rounded-xl border border-mono-700/80 bg-mono-900/80 ${textPrimaryOnDark} focus:ring-2 focus:ring-green-400/50 outline-none focus:outline-none transition-colors`;

/**
 * `DefaultValueInput` outer shell (focus ring wraps control + preset pill).
 */
export const defaultValueComboShell =
  'flex items-center w-full rounded-xl border border-mono-700/80 bg-mono-900/80 focus-within:ring-2 focus-within:ring-green-400/50 focus-within:outline-none transition-colors overflow-hidden';

/**
 * Validator template gallery / form: muted `border-mono-600` controls used inside frosted drawers.
 */
export const inputValidatorControl = `w-full px-3 py-1.5 border border-mono-600 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent bg-mono-900/80 ${textPrimaryOnDark} transition-colors`;

export const inputValidatorSearch = `w-full px-3 py-2 border border-mono-600 rounded-xl text-sm bg-mono-900/80 ${textPrimaryOnDark} focus:ring-2 focus:ring-green-400 focus:border-transparent transition-colors`;

/**
 * Member search inline on object form — green focus ring variant, `pr-8` for icon.
 */
export const inputObjectMemberSearch = `w-full px-3 py-1.5 border border-mono-700/80 bg-mono-900/80 rounded-xl ${textPrimaryOnDark} focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none transition-colors text-sm pr-8`;

/**
 * Disabled read-only field — same shell and radius as {@link inputGlass}, muted text, no focus ring.
 * Use for locked context (e.g. namespace on API forms).
 */
export const inputGlassDisabled =
  'w-full px-3 py-1.5 border border-mono-700/80 rounded-xl bg-mono-900/70 text-mono-400 cursor-not-allowed text-sm outline-none';

/** Multiline control inside frosted drawer/modal (matches {@link inputGlass} rhythm, no blur). */
export const textareaInsideFrostedPanel = `w-full ${inputGlassCore}`;

/** Inset panel inside frosted drawer/modal — compose with spacing, e.g. `p-3 ${surfaceInsideFrostedPanel}`. */
export const surfaceInsideFrostedPanel = 'bg-mono-900/75 rounded-xl border border-mono-700/80';

/**
 * Full-width navigation row inside a drawer (jump to API detail).
 */
export const drawerLinkedEntityRow = `flex items-center space-x-2 w-full px-3 py-2 ${surfaceInsideFrostedPanel} hover:border-mono-600 hover:bg-mono-700 transition-colors text-left`;

/** Compact row showing a selected entity (e.g. object picker). */
export const objectSelectorDisplayRow =
  'w-full px-3 border border-mono-700/80 rounded-xl bg-mono-900/80 shadow-inner flex items-center justify-between h-[34px]';

/** Shared shell for API generator 34px-high inputs (query/path param editors). */
const apiGeneratorRowControlCore = `w-full px-3 text-sm border border-mono-700/80 rounded-xl bg-mono-900/80 ${textPrimaryOnDark} focus:ring-2 focus:ring-green-400/50 outline-none focus:outline-none transition-colors h-[34px]`;

export const apiGeneratorRowInputMono = `${apiGeneratorRowControlCore} font-mono`;

export const apiGeneratorRowSelect = apiGeneratorRowControlCore;

/** Muted placeholder row when a linked control is unavailable (no object, etc.). */
export const apiGeneratorHintCell =
  'w-full px-3 py-1.5 text-sm border border-mono-700/80 rounded-xl bg-mono-900/80 text-mono-400';

// --- Dropdowns / floating panels ---

export const dropdownPanel =
  'absolute z-30 w-full mt-1 bg-mono-950 border border-mono-700/80 rounded-xl shadow-lg shadow-black/30 max-h-60 overflow-hidden flex flex-col';

export const dropdownPanelMessage =
  'absolute z-30 w-full mt-1 bg-mono-950 border border-mono-700/80 rounded-xl shadow-lg shadow-black/30';

export const dropdownListScroll = 'min-h-0 overflow-y-auto';

export const dropdownRow =
  'w-full px-3 py-2 text-left hover:bg-mono-800 border-b border-mono-700 last:border-b-0 transition-colors';

export const listMetaBadge = 'text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded-lg';

/**
 * Icon-only row remove control (`fa-solid fa-xmark`). Use for delete/unlink in form and generator rows.
 * Keeps destructive inline actions visually consistent (see CLAUDE.md form standards).
 */
export const inlineRemoveIconButton =
  'p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors shrink-0';

export const dropdownCreateRow = `w-full text-left px-3 py-2 text-sm text-mono-400 hover:bg-mono-800 ${hoverTextPrimaryOnDark} rounded-lg cursor-pointer flex items-center space-x-2`;

// --- API generator: query parameters (matches QueryParamRow glass cells) ---

/** Read-only cell for locked pagination rows (limit / offset / operator) — same height and radius as editable inputs */
export const queryParamReadonlyCell =
  'w-full px-3 text-sm border border-mono-700/80 rounded-xl bg-mono-900/80 text-mono-400 cursor-not-allowed flex items-center h-[34px]';

export const queryParamPaginationDivider = 'border-t border-mono-700/80 pt-1.5';

export const queryParamPaginationToggleBase =
  'text-xs px-2 py-1.5 rounded-xl border font-inter font-medium transition-colors flex items-center space-x-1';

export const queryParamPaginationToggleOff = `text-mono-400 border-mono-600/80 ${hoverTextPrimaryOnDark} hover:border-mono-500 hover:bg-mono-800/40`;

export const queryParamPaginationToggleOn =
  'text-red-400 border-red-400/40 hover:bg-red-400/10';

/** Small label for synthetic query param kind (e.g. built-in pagination) */
export const queryParamBuiltinBadge =
  'text-[10px] text-mono-500 bg-mono-800/60 border border-mono-700/50 px-1.5 py-0.5 rounded-lg uppercase tracking-wide font-inter';

// --- Segmented toggles (two-state / N-state pill rows) ---

export const segmentFieldBase =
  'px-3 py-1.5 text-sm border transition-colors first:rounded-l-xl last:rounded-r-xl';

export const segmentFieldBaseJoin =
  'px-3 py-1.5 text-sm border transition-colors border-l-0 first:rounded-l-xl last:rounded-r-xl';

export const segmentFieldInactive = 'bg-mono-900/75 text-mono-400 border-mono-600 hover:border-mono-500';

export const segmentFieldActive = 'bg-green-400 text-mono-950 font-bold border-green-400';

export const segmentPillBase =
  'px-5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors text-center first:rounded-l-xl last:rounded-r-xl';

export const segmentPillSelected = 'bg-mono-900/75 text-green-400 border border-green-400/50';

export const segmentPillUnselected =
  'bg-mono-900/75 text-mono-400 border border-mono-700 hover:border-mono-500 hover:text-mono-300';

export const segmentPillUnselectedLocked = 'bg-mono-900/75 text-mono-500 border border-mono-700';

// --- Cards (dashboard, stats) ---

export const cardGlassSurface =
  'bg-mono-900/50 backdrop-blur-sm/40 rounded-2xl shadow-sm hover:bg-mono-900/50 backdrop-blur-sm/60 transition-colors';

export const cardGlassBorderDefault = 'border border-mono-800/80';

export const cardGlassBorderError = 'border border-red-400/30 bg-red-950/10';

/** Onboarding callout on dashboard (softer blur). */
export const cardOnboardingShell =
  'bg-mono-900/50 backdrop-blur-sm/30 border border-mono-800/80 rounded-2xl p-6 shadow-md';

// --- Accent tiles (icons) ---

export const accentIconTile =
  'rounded-xl bg-green-400/10 text-green-400 flex items-center justify-center shadow-glow-green-icon';

export const accentIconTileError = 'rounded-xl bg-red-400/10 text-red-400 flex items-center justify-center';

// --- Sidebar ---

const sidebarShellBase = 'text-mono-300 font-inter flex flex-col shrink-0 overflow-hidden';

export const sidebarShell =
  `${sidebarShellBase} transition-[width] duration-[400ms]`;

export const sidebarShellMotionLocked = sidebarShellBase;

/** Horizontal rule between nav groups in collapsed (icon-only) mode */
export const sidebarSectionDividerHorizontal = 'border-t border-mono-800/60 my-2';

export const sidebarNavItemBase =
  'flex w-full min-h-11 items-center cursor-pointer transition-all rounded-l-none rounded-r-xl';

export const sidebarNavItemActive = `bg-mono-800/80 ${textPrimaryOnDark} shadow-sm border border-mono-700/50`;

export const sidebarNavItemInactive = `hover:bg-mono-800/50 ${hoverTextPrimaryOnDark} border border-transparent`;

// --- Dashboard main column (sidebar right pane) ---

/** Fills the flex slot next to the sidebar; enables scroll inside the body. */
export const dashboardMainColumn = 'flex flex-col flex-1 min-h-0 w-full';

/**
 * Layered dashboard green wash: top-right radial over matching linear washes — bottom-to-top and
 * left-to-right (same stops, `transparent` into `bg-mono-950`). First image in the list paints on top.
 */
export const dashboardGreenWashGradient =
  'bg-[radial-gradient(ellipse_82%_68%_at_100%_0%,rgb(82_226_140/0.04)_0%,rgb(82_226_140/0.013)_50%,transparent_82%),linear-gradient(to_top,rgb(74_222_128/0.035),rgb(74_222_128/0.01)_45%,transparent),linear-gradient(to_right,rgb(74_222_128/0.022),rgb(74_222_128/0.006)_45%,transparent)]';

/**
 * Full dashboard viewport background: `mono-950` plus combined wash (same for every route).
 * Signature retains `pathname` for call sites that pass `page.url.pathname`; reserved for future tuning.
 */
export function dashboardMainColumnCanvasForPath(_pathname: string): string {
  return `bg-mono-950 ${dashboardGreenWashGradient}`;
}

/**
 * Static default canvas (= {@link dashboardMainColumnCanvasForPath} for routes that do not match a rule).
 * `(dashboard)` layout should prefer {@link dashboardMainColumnCanvasForPath}.
 */
export const dashboardMainColumnCanvas = `bg-mono-950 ${dashboardGreenWashGradient}`;

/**
 * Page header band (title row + actions): no border or separate glass so it blends with `dashboardMainColumnCanvas`.
 * Matches sidebar brand row: `p-4` + 48px content band.
 */
export const dashboardPageHeaderShell =
  'relative z-[60] w-full shrink-0 py-4 px-4';

/** Horizontal padding for search / toolbars under the page header (keep in sync with `dashboardPageHeaderShell`). */
export const mainColumnChromePaddingX = 'px-4';

/**
 * Search + filter row directly under `PageHeader` (see `SearchBar`).
 * No second glass strip or border — flows with `dashboardMainColumnCanvas`.
 */
export const dashboardSearchToolbarShell =
  'relative z-50 w-full shrink-0 py-4';

/** Primary title line height band — matches `Logo` `md` (48px) with sidebar `items-center` row. */
export const dashboardPageHeaderTitleBand = 'min-h-[48px] flex items-center';

/** Shared typography for {@link dashboardPageTitleText} / {@link dashboardPageTitleTextDetail} (no flex shrink). */
const dashboardPageTitleTextCore = `text-2xl ${textPrimaryOnDark} font-inter font-bold tracking-tight leading-tight truncate min-w-0`;

/**
 * Main column page title (`PageHeader` h1): same chroma as sidebar brand / table primary text, not pure `text-white`.
 */
export const dashboardPageTitleText = `${dashboardPageTitleTextCore} shrink`;

/**
 * API detail header h1: `shrink-0` so pills/meta keep priority in the flex row; still truncates via `min-w-0` + max-width from flex.
 */
export const dashboardPageTitleTextDetail = `${dashboardPageTitleTextCore} shrink-0`;

/**
 * Drawer panel title (`DrawerHeader` h2): same chroma as page titles.
 */
export const drawerHeaderTitleText = `text-xl ${textPrimaryOnDark} font-inter font-bold tracking-tight leading-tight truncate min-w-0 shrink`;

/**
 * Middle dot before namespace meta — matches API detail title band (`hidden sm:inline` uses viewport breakpoint).
 */
export const headerMetaSeparator = 'text-mono-600 shrink-0 hidden sm:inline';

/**
 * Namespace cluster (layer icon + name) — API detail + drawer headers; `text-sm` for readability in drawers.
 */
export const headerNamespaceCluster =
  'hidden sm:inline-flex items-center gap-1.5 text-sm text-mono-400 shrink-0 max-w-[10rem] truncate';

/**
 * System entity cluster (lock icon + label) — drawer headers for built-in / read-only entities; same layout rhythm as `headerNamespaceCluster`.
 */
export const headerSystemCluster = headerNamespaceCluster;

// --- Dashboard entity list tables (Types, Fields, Objects, …) ---

/**
 * Outer wrapper for `Table`: horizontal alignment with `PageHeader` / `SearchBar`, bottom spacing above scroll end.
 */
export const tableListPageGutter = `${mainColumnChromePaddingX} pb-4 w-full min-h-0`;

/**
 * Layout wrapper for the list table: no fill or border — table chrome comes from {@link dashboardMainColumnCanvas} behind it.
 */
export const tableListCardShell = 'w-full min-w-0 overflow-x-auto';

/** Low-contrast row rules between body rows (`<tbody>` with `divide-y`). */
export const tableListBodyDivide = 'divide-y divide-mono-800/30';

/**
 * Sticky table header: transparent; only a row rule separates header from body.
 */
export const tableListThead = 'sticky top-0 z-10 bg-transparent border-b border-mono-800/30';

/** Standard `<th>` / `<td>` padding — matches `mainColumnChromePaddingX` rhythm. */
export const tableListCell = 'px-4 py-4';

/**
 * Sortable list column header (`SortableColumn`): uppercase label, same foreground as primary body cells.
 */
export const tableListHeaderSortable = `text-xs uppercase font-inter ${dashboardTextPrimary} tracking-wider font-bold`;

/** Primary body cell (entity name / title). */
export const tableListBodyPrimary = `text-sm ${dashboardTextPrimary} font-medium`;

/**
 * `<td>` whose entire cell is the primary entity label (Type name, Field constraint name).
 * Prefer this over repeating `{@link tableListCell} whitespace-nowrap {@link tableListBodyPrimary}`.
 */
export const tableListCellPrimary = `${tableListCell} whitespace-nowrap ${tableListBodyPrimary}`;

/** Standard body cell copy (namespace, counts, full-cell descriptions, monospace values). */
export const tableListBodyCell = `text-sm ${dashboardTextPrimary}`;

/**
 * Secondary line under a title inside the same `<td>` (e.g. API subtitle) — stays softer than {@link tableListBodyPrimary}.
 */
export const tableListBodyCaption = 'text-xs text-mono-400';

/** Underlined link inside list tables or list-drawer detail (documentation URLs). */
export const tableListBodyLink = `text-sm ${dashboardTextPrimary} underline hover:text-mono-300 transition-colors`;

/**
 * Muted inline label in auxiliary rows (validator parameter / field-mapping titles).
 */
export const tableListAuxiliaryLabel = 'text-sm text-mono-300 font-medium';

/** Primary name line in a drawer opened from a list row (`DetailField` value). Alias of {@link tableListBodyPrimary}. */
export const tableListDetailTitle = tableListBodyPrimary;

/**
 * Section heading inside a list-row drawer (namespace info panels, etc.).
 */
export const tableListPanelSectionTitle = `${tableListAuxiliaryLabel} mb-2`;

/** Left or inline label for summary stats (“Total”) under a list selection. */
export const tableListPanelStatLabel = 'text-mono-300 font-medium';

/** Emphasized total / rollup number in those stat blocks. */
export const tableListPanelStatTotal = `${dashboardTextPrimary} font-bold`;

export const tableListRowInteractive = 'cursor-pointer transition-colors';

export const tableListRowHover = 'hover:bg-mono-900/70';

export const tableListRowSelected = 'bg-mono-800';

// --- Drawer stack ---

/** Overlay behind drawers — visual values come from `.drawer-scrim` in `app.css`. */
export const drawerScrim =
  'drawer-scrim fixed top-0 right-0 h-screen z-[60]';

/** Root wrapper for the shared drawer overlay stack. */
export const drawerStackRoot =
  'drawer-stack-root fixed right-0 top-0 h-screen z-[70] flex justify-end pointer-events-none';

/**
 * Shared frosted shell for drawer panels (see `.drawer-panel-glass-surface` in `app.css` for blur + fill).
 */
export const drawerPanelGlassSurface = 'drawer-panel-glass-surface';

/**
 * Drawer panel shell (outer): visual chrome comes from `.drawer-panel-glass-surface` in `app.css`.
 * Keep overflow clipping on the inner wrapper so shell treatment stays centralized.
 */
export const drawerPanelFlexibleOuter =
  `h-[calc(100vh-32px)] m-4 flex min-h-0 flex-col ${drawerPanelGlassSurface} relative pointer-events-auto`;

/** Scroll clip + column layout inside {@link drawerPanelFlexibleOuter} / {@link drawerPanelStackedOuter}. */
export const drawerPanelFlexibleInner =
  'drawer-transparent-context flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]';

export const drawerPanelStackedOuter =
  `flex h-[calc(100vh-32px)] min-h-0 flex-shrink-0 flex-col ${drawerPanelGlassSurface} relative my-4 mr-4 pointer-events-auto`;

export const drawerPanelStackedInner = drawerPanelFlexibleInner;

/** Stacked-panel dimmer — visual values come from `.drawer-stack-dimmer` in `app.css`. */
export const drawerStackDimmer =
  'drawer-stack-dimmer absolute inset-0 z-10 pointer-events-none rounded-[inherit]';

/**
 * Centered modal panels — same frosted shell as `DrawerStack` so all overlay forms match.
 */
export const modalPanelGlassSurface = drawerPanelGlassSurface;

// --- Drawer footer & primary actions ---

/** Default drawer footer shell (guttered). Pair with {@link drawerFooterShellEdge} via `DrawerFooter` `padding` prop. */
export const drawerFooterShellInset = 'drawer-footer-shell p-6';

/** Flush footer shell for full-width segmented actions (no horizontal inset). */
export const drawerFooterShellEdge = 'drawer-footer-shell px-0 pt-0 pb-0';

export const drawerFooterBtnBlock =
  'w-full px-4 py-2 rounded-xl text-sm border font-inter tracking-wide transition-colors';

/**
 * CRUD drawer segmented toolbar: edge-to-edge inside the footer, no outer box border (dividers only).
 */
export const drawerFooterSegmentedPanel =
  'drawer-footer-segmented-panel flex flex-col sm:flex-row overflow-hidden';

/** Separator between {@link drawerFooterSegmentBtn} cells (horizontal rule when stacked, vertical in row layout). */
export const drawerFooterSegmentDivider =
  'shrink-0 h-px sm:h-auto sm:self-stretch sm:w-px bg-mono-700/80';

/**
 * Segment control inside {@link drawerFooterSegmentedPanel}. Combine with {@link drawerFooterBtnPrimaryEnabled} and friends.
 */
export const drawerFooterSegmentBtn =
  'inline-flex items-center justify-center gap-2 w-full sm:flex-1 min-w-0 px-3 py-3 text-sm font-inter tracking-wide transition-colors outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-400/40';

export const drawerFooterBtnPrimaryEnabled =
  'bg-green-400 border-transparent text-mono-950 font-semibold shadow-sm hover:bg-green-300 cursor-pointer';

/** Box matches enabled primary; typography matches muted secondary so disabled Save/Undo read as a pair. */
export const drawerFooterBtnPrimaryDisabled =
  'font-medium bg-mono-800 border-mono-700 text-mono-400 cursor-not-allowed shadow-sm';

/** Primary disabled segment inside {@link drawerFooterSegmentedPanel} (panel border only). */
export const drawerFooterBtnPrimaryDisabledSegment =
  'font-medium bg-mono-800 text-mono-400 cursor-not-allowed shadow-sm';

export const drawerFooterBtnSecondary =
  'border border-mono-600 text-mono-300 transition-colors font-medium font-inter tracking-wide hover:bg-mono-800 cursor-pointer';

/** Secondary segment inside {@link drawerFooterSegmentedPanel} (no per-cell border). */
export const drawerFooterBtnSecondarySegment =
  'text-mono-300 transition-colors font-medium font-inter tracking-wide hover:bg-mono-800/80 cursor-pointer';

export const drawerFooterBtnSecondaryMuted =
  'border border-mono-700 text-mono-400 font-medium cursor-not-allowed bg-mono-800 shadow-sm';

/** Muted secondary for segmented footer cells. */
export const drawerFooterBtnSecondarySegmentMuted =
  'text-mono-400 font-medium cursor-not-allowed bg-mono-800/80 shadow-sm';

/** Full-width Delete control in drawer footers (paired with {@link drawerFooterBtnDestructiveDisabled}). */
export const drawerFooterBtnDestructive =
  'bg-red-400/10 border-transparent text-red-400 hover:bg-red-400/20 cursor-pointer';

export const drawerFooterBtnDestructiveDisabled =
  'bg-mono-700 border-mono-700 text-mono-400 cursor-not-allowed';

/** Destructive segment disabled (no extra border; {@link drawerFooterSegmentDivider} separates cells). */
export const drawerFooterBtnDestructiveDisabledSegment =
  'bg-mono-800/90 text-mono-400 cursor-not-allowed';

/** Full-width prompt above segmented delete confirmation (edge-aligned with drawer footer). */
export const drawerFooterDeleteConfirmBanner =
  'px-3 py-2.5 text-sm font-medium text-red-400 bg-red-400/10 border-b border-mono-700/80 font-inter tracking-wide';

/** Destructive confirm segment in {@link drawerFooterSegmentedPanel} (e.g. Yes, delete). */
export const drawerFooterBtnDangerConfirmSegment =
  'bg-red-600 text-white font-semibold shadow-sm hover:bg-red-700 cursor-pointer border-transparent';

export const drawerFooterBtnDangerConfirmSegmentBusy =
  'bg-red-400 text-white font-medium cursor-not-allowed shadow-sm border-transparent';

/** Wrapper div for inline delete confirmation (rounded to match glass chrome). */
export const drawerFooterDangerCallout = 'bg-red-400/10 border border-red-400/30 p-3 rounded-xl';

/** Confirm row — primary destructive (e.g. Yes, delete). */
export const drawerFooterBtnDangerConfirm =
  'flex-1 px-3 py-1.5 rounded-xl border border-transparent text-sm font-medium font-inter tracking-wide transition-colors bg-red-600 text-white hover:bg-red-700 cursor-pointer';

export const drawerFooterBtnDangerConfirmBusy =
  'flex-1 px-3 py-1.5 rounded-xl border border-transparent text-sm font-medium font-inter tracking-wide transition-colors bg-red-400 text-white cursor-not-allowed';

/** Confirm row — cancel / secondary. */
export const drawerFooterBtnDangerCancel =
  'flex-1 px-3 py-1.5 rounded-xl border text-sm font-medium font-inter tracking-wide transition-colors border-mono-600 text-mono-300 hover:bg-mono-800 cursor-pointer';

export const drawerFooterBtnDangerCancelBusy =
  'flex-1 px-3 py-1.5 rounded-xl border text-sm font-medium font-inter tracking-wide transition-colors border-mono-700 text-mono-400 cursor-not-allowed bg-mono-800';

export const btnCtaGlow =
  'px-5 py-2.5 bg-green-400 text-mono-950 font-inter font-semibold rounded-xl text-sm hover:bg-green-300 transition-all shadow-glow-green cursor-pointer';

export const btnGenerateSm =
  'text-xs px-4 py-1.5 rounded-lg bg-green-400 text-mono-950 font-inter font-bold hover:bg-green-300 transition-colors cursor-pointer flex items-center space-x-1 shadow-glow-green-sm';

export const btnEmptyStatePrimary =
  'mt-5 px-6 py-2.5 bg-green-400 text-mono-950 font-inter font-bold rounded-2xl tracking-wide shadow-glow-green hover:bg-green-300 transition-all cursor-pointer';

// --- Modal dialogs (inline footer row, not full-width like drawer) ---

export const modalFooterBtnSecondary =
  'px-4 py-2 rounded-xl border border-mono-600 text-mono-300 font-inter font-medium text-sm transition-colors';

export const modalFooterBtnPrimary =
  'px-4 py-2 rounded-xl font-inter font-semibold text-sm tracking-wide flex items-center space-x-2 transition-colors';

export const modalFooterBtnPrimaryEnabled =
  'bg-green-400 text-mono-950 hover:bg-green-300 cursor-pointer shadow-glow-green-sm';

export const modalFooterBtnPrimaryDisabled = 'bg-mono-700 text-mono-400 cursor-not-allowed';

/** Inline error callout (e.g. Generate dialog) */
export const modalInlineError = 'bg-red-400/10 border border-red-400/30 p-3 mb-4 rounded-xl';

/** Checkbox / radio inside frosted modal — solid fill, no nested blur */
export const modalFormCheckbox =
  'w-4 h-4 text-green-400 border-mono-600 rounded focus:ring-2 focus:ring-green-400 bg-mono-900';

export const modalFormRadio = 'w-3.5 h-3.5 text-green-400 border-mono-600 bg-mono-900 focus:ring-green-400';

// --- Dashboard loading shell ---

export const dashboardLoadingRoot = 'flex h-screen items-center justify-center bg-mono-950';

export const dashboardLoadingLabel = 'mt-4 text-mono-400 font-inter text-sm font-medium';

// --- Marketing (landing) ---

export const marketingHeader =
  'bg-mono-950/80 backdrop-blur-md border-b border-mono-800/60 sticky top-0 z-50';

export const marketingMobileMenu =
  'md:hidden border-t border-mono-800/60 bg-mono-950/95 backdrop-blur-xl';

export const marketingNavLink = 'text-mono-400 hover:text-white font-inter font-medium text-sm transition-colors';

export const marketingNavLinkMobile = `block text-mono-400 ${hoverTextPrimaryOnDark} font-inter font-medium text-base py-3 transition-colors`;

/** Header / compact CTAs: same corner radius as in-page buttons (`rounded-xl`), denser padding for the top bar */
const marketingNavCtaShell =
  'inline-flex items-center justify-center px-5 py-2.5 min-h-[40px] font-inter font-medium text-sm rounded-xl';

export const marketingCtaOutline = `${marketingNavCtaShell} text-green-400 border border-green-400/50 hover:bg-green-400/10 transition-colors`;

export const marketingCtaPrimary = `${marketingNavCtaShell} bg-green-400 text-mono-950 hover:bg-green-300 transition-colors shadow-glow-green`;

export const marketingBetaPill =
  'inline-flex items-center space-x-2 bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20 shadow-glow-green-sm';

export const marketingBetaDot = 'w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-glow-green-dot';

/** Hero, final CTA, and paired outline buttons share one geometry so adjacent rows align */
const marketingLgCtaShell =
  'inline-flex items-center justify-center px-8 py-3.5 min-h-[48px] font-inter font-semibold text-base rounded-xl';

export const marketingHeroCta = `${marketingLgCtaShell} bg-green-400 text-mono-950 shadow-glow-green-lg hover:shadow-glow-green-xl hover:bg-green-300 transition-all`;

export const marketingHeroCtaSecondary = `${marketingLgCtaShell} bg-mono-900/50 backdrop-blur-sm text-white border border-mono-800 hover:bg-mono-800/80 transition-all`;

export const marketingFooterCta = `${marketingLgCtaShell} bg-green-400 text-mono-950 shadow-glow-green-lg hover:shadow-glow-green-xl hover:bg-green-300 transition-all`;

/** Tertiary / sign-in next to primary in closing section — same box as `marketingFooterCta` */
export const marketingFooterCtaSecondary = `${marketingLgCtaShell} border border-mono-700/80 text-mono-300 hover:text-white hover:bg-mono-900/40 transition-all`;

export const marketingFeatureIcon =
  'w-12 h-12 bg-green-400/10 text-green-400 rounded-xl flex items-center justify-center mb-6 shadow-glow-green-icon';

/**
 * Step column: index + rail row; index sits left of the copy (see {@link marketingHowItWorksWatermark}).
 */
export const marketingHowItWorksStepColumn =
  'relative flex items-start gap-3 pb-2 sm:gap-5 overflow-visible';

/**
 * Ghost 01–03: Inter, left of the rail; larger than prior upper-right watermark, pairs with slightly dropped copy in {@link marketingHowItWorksStepBody}.
 */
export const marketingHowItWorksWatermark =
  'pointer-events-none z-0 shrink-0 select-none whitespace-nowrap text-left font-inter font-black leading-none tracking-tighter text-mono-600/35 tabular-nums text-[clamp(5rem,11.25vw,8.875rem)]';

/** Green rail + step copy (foreground); top padding lowers title/body vs the index cap height. */
export const marketingHowItWorksStepBody =
  'relative z-10 min-w-0 flex-1 border-l-2 border-green-400/70 pl-4 sm:pl-5 pt-2 sm:pt-2.5';

/** Step title — same rhythm as feature cards. */
export const marketingHowItWorksStepTitle =
  'mb-3 font-inter text-lg font-semibold text-white tracking-wide';

export const marketingProgressBarGlow = 'shadow-glow-green-bar';

// --- Clerk appearance.elements (class strings; variables stay hex in clerk.ts) ---

export const clerkCard =
  'bg-mono-950/60 backdrop-blur-xl border border-mono-800/80 rounded-3xl shadow-2xl';

/**
 * UserButton account menu — same frost as {@link drawerPanelGlassSurface} / stacked drawers.
 */
export const clerkUserButtonPopoverCard = drawerPanelGlassSurface;

/**
 * Inner Clerk slots default to `colorBackground`; keep them clear so the card glass reads like drawer chrome.
 */
export const clerkUserButtonPopoverMain = 'bg-transparent';

/** Actions block (manage account / sign out) — no second opaque fill. */
export const clerkUserButtonPopoverActions = 'bg-transparent';

/**
 * Footer (Secured by Clerk) — light tint only so the stripe pattern still reads over the shared frost.
 */
export const clerkUserButtonPopoverFooter = 'bg-mono-950/25 border-t border-white/10';

export const clerkFormButtonPrimary =
  'bg-green-400 text-mono-950 hover:bg-green-300 font-inter font-semibold tracking-wide rounded-xl shadow-glow-green';

export const clerkFormFieldInput = `bg-mono-900/50 border border-mono-700/80 ${textPrimaryOnDark} rounded-xl`;

export const clerkAvatarBox = 'border border-mono-800/80 rounded-full';

export const clerkFooterActionLink = 'text-green-400 hover:text-green-300';

export const clerkSocialGithub = '[&>img]:invert';

export const clerkNavbar = 'bg-mono-900/50 border-r border-mono-800/80';

export const clerkNavbarButton = `text-mono-300 ${hoverTextPrimaryOnDark} hover:bg-mono-800/50 data-[active=true]:bg-mono-800/50 data-[active=true]:${textPrimaryOnDark} rounded-lg transition-colors`;

export const clerkPageScrollBox = 'bg-mono-950/40';

export const clerkProfileSectionBorder = 'border-b border-mono-800/80';

export const clerkProfileSectionDanger = 'border-b border-red-500/30';

export const clerkProfileSectionTitle = `${textPrimaryOnDark} font-inter font-semibold`;

export const clerkProfileSectionContent = 'text-mono-300 font-inter';

export const clerkProfilePrimaryButton = 'text-green-400 hover:text-green-300';

export const clerkBadge = 'bg-mono-800/50 text-mono-300 border border-mono-700/60 rounded-full';

export const clerkModalClose = `text-mono-400 ${hoverTextPrimaryOnDark} transition-colors`;

/** Match {@link drawerScrim} so Clerk modals read like `DrawerStack` overlays. */
export const clerkModalBackdrop = 'bg-mono-950/45 backdrop-blur-[1.5px]';

/**
 * Outer dialog shell for Clerk modal flows — same frost as {@link drawerPanelGlassSurface}.
 * Inner `card` is overridden to transparent where the profile opens in a modal (see `ClerkSidebarUser`).
 */
export const clerkModalContentShell = `${drawerPanelGlassSurface} overflow-hidden`;

/**
 * Inner profile card when the shell is already frosted (`modalContent` + {@link clerkModalContentShell}).
 * Keeps a single glass layer so the modal matches drawer panels.
 */
export const clerkProfileModalInnerCard = 'bg-transparent border-0 shadow-none ring-0';

export const clerkHeaderTitle = `${textPrimaryOnDark} font-inter font-bold`;

export const clerkHeaderSubtitle = 'text-mono-400 font-inter';

export const clerkFormFieldLabel = 'text-mono-300 font-inter';

export const clerkAccordionTrigger = `text-mono-300 ${hoverTextPrimaryOnDark}`;

export const clerkBreadcrumbs = 'text-mono-400 font-inter';

export const clerkBreadcrumbsItem = `text-mono-400 ${hoverTextPrimaryOnDark} transition-colors`;

export const clerkBreadcrumbsDivider = 'text-mono-600';
