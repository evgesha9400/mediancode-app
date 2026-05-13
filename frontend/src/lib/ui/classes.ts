/**
 * UI class primitives — composite Tailwind patterns for the glass theme.
 *
 * Colors use semantic tokens (text-fg, bg-surface, border-edge, etc.) defined
 * in `appTheme.ts` → `tailwind.config.js`. Individual color classes should be
 * used directly in templates — this file is for *composites* that bundle
 * layout + color + interaction in a reusable string.
 *
 * Inventory — repeated Tailwind clusters and where they live:
 * | Cluster | tailwind.config | this module |
 * | Text input + accent focus (solid on frosted overlays) | — | `inputGlass`, `inputGlassSearch`, `inputGlassDisabled`, `textareaInsideFrostedPanel`, `inputGlassDense`, `textareaObjectForm`, `searchBarInput`, `defaultValueComboShell`, `inputValidatorControl`, `inputValidatorSearch`, `inputObjectMemberSearch` |
 * | Segmented toggles (drawer / API generator) | — | `segmentFieldBase`, `segmentFieldBaseJoin`, `segmentFieldInactive`, `segmentFieldActive`, `segmentPillBase`, `segmentPillSelected`, `segmentPillUnselected`, `segmentPillUnselectedLocked` |
 * | API generator 34px row controls | — | `apiGeneratorRowInputMono`, `glassSelectTrigger`, `apiGeneratorHintCell` |
 * | Modal form controls | — | `modalFormCheckbox`, `modalFormRadio` |
 * | Autocomplete / dropdown panels (opaque; see `app.css`) | — | `dropdownPanelSolidSurface`, `dropdownPanel`, `dropdownPanelMessage`; page-level menus use `popoverGlassMenuChrome` |
 * | Query params / pagination rows | — | `queryParamReadonlyCell`, `queryParamPaginationToggle*` |
 * | Dashboard & stat cards | `drawer-deep` | `dashboardCardGlass`, `cardGlassSurface`, `cardGlassBorder*` |
 * | Accent icon tiles | `glow-accent-icon`, `glow-accent-sm` | `accentIconTile`, `marketingFeatureIcon` |
 * | Sidebar shell & nav items | `drawer-panel-backdrop` (app.css) | `sidebarShell`, `sidebarNavItem*`; active: `.sidebar-nav-item-active-glass` |
 * | Dashboard column shell & page header chrome | — | `dashboardMainColumn`, `dashboardMainColumnCanvas`, `dashboardMainColumnCanvasForPath`, `dashboardGreenWashGradient`, `dashboardTextPrimary`, `dashboardControlTextMutedHoverPrimary`, `backNavButton`, `dashboardPageHeaderShell`, `dashboardSearchToolbarShell`, `mainColumnChromePaddingX`, `dashboardPageHeaderTitleBand`, `dashboardPageTitleText`, `dashboardPageTitleTextDetail`, `drawerHeaderTitleText`, `headerMetaSeparator`, `headerNamespaceCluster` |
 * | Dashboard entity list tables | — | `tableListPageGutter`, `tableListCardShell`, `tableListBodyDivide`, `tableListCell`, `tableListCellPrimary`, `tableListHeaderSortable`, `tableListBodyPrimary`, `tableListBodyCell`, `tableListBodyCaption`, `tableListBodyLink`, `tableListAuxiliaryLabel`, `tableListDetailTitle`, `tableListPanelSectionTitle`, `tableListPanelStatLabel`, `tableListPanelStatTotal`, `tableListRowInteractive`, `tableListRowHover`, `tableListRowSelected` |
 * | Drawer & modal frosted shells | `drawer-deep` | `drawerPanelGlassSurface`, `popoverGlassMenuChrome`, `modalPanelGlassSurface`, `modalDialogBackdropClass`, `modalPanelTransparentInner`, `drawerPanelFlexibleOuter`, `drawerPanelFlexibleInner`, `drawerPanelStackedOuter`, `drawerPanelStackedInner`, `drawerBodyScrollArea`, `drawerFooterShellInset`, `drawerFooterShellEdge`, `drawerScrim`, `drawerLinkedEntityRow`, … |
 * | Primary / secondary / destructive / undo / duplicate | `glow-accent` | `drawerFooterSegmentedPanel`, `drawerFooterSegmentBtn`, `drawerFooterDeleteConfirmBanner`, `drawerFooterBtnDangerConfirmSegment*`, `drawerFooterBtnPrimary*`, `drawerFooterBtnSecondarySegment*`, `drawerFooterBtnUndoSegment*`, `drawerFooterBtnDuplicateSegment*`, `drawerFooterBtnDestructive*`, `drawerFooterDangerCallout`, `drawerFooterBtnDangerConfirm*`, `drawerBodyScrollArea`, `modalFooterBtn*`, `btnCtaGlow`, … |
 * | Marketing landing | `glow-*` | `marketingCtaPrimary` (nav), `marketingHeroCta` + `marketingHeroCtaSecondary`, `marketingFooterCta` + `marketingFooterCtaSecondary`, `marketingHowItWorks*` |
 * | Clerk `appearance.elements` | `glow-accent`, `drawer-deep` | `clerkCard`, `clerkModalContentShell`, `clerkUserButtonPopover*`, `clerkFormButtonPrimary`, … |
 */

/** Primary foreground on dashboard dark / glass (`text-fg` token — use exports in components, not raw `text-white`). */
const textPrimaryOnDark = 'text-fg';

const hoverTextPrimaryOnDark = 'hover:text-fg';

/** Import in Svelte for primary copy on dark surfaces (lists, labels, frosted panels). */
export const dashboardTextPrimary = textPrimaryOnDark;

/** Semantic soft-theme accent vocabulary — keep accent ownership here instead of scattering raw utilities. */
export const themeAccentText = 'text-accent';

export const themeAccentSurfaceSoft = 'bg-accent/10';

export const themeAccentSurfaceMuted = 'bg-accent/20';

export const themeAccentBorderSoft = 'border-accent/20';

export const themeAccentBorderMedium = 'border-accent/30';

export const themeAccentBorderStrong = 'border-accent/50';

export const themeAccentBorder = 'border-accent';

export const themeAccentBorderEmphasis = 'border-accent-strong';

export const themeAccentFill = 'bg-accent';

export const themeAccentFillStrong = 'bg-accent-strong';

export const themeAccentFillHover = 'hover:bg-accent-hover';

export const themeAccentGlowGradient = 'bg-gradient-to-r from-accent/20 to-accent-support/20';

export const themeAccentFocusRing = 'focus:ring-accent';

export const themeAccentFocusRingSoft = 'focus:ring-accent/50';

export const themeAccentBadge = `${themeAccentSurfaceSoft} ${themeAccentText}`;

export const themeAccentStatusBadge = `${themeAccentBadge} border ${themeAccentBorderSoft}`;

export const themeAccentIconBadge = `${themeAccentBadge} flex items-center justify-center`;

export const themeAccentCheckbox = `w-4 h-4 ${themeAccentText} border-edge-strong rounded focus:ring-2 ${themeAccentFocusRing} bg-surface`;

const themeAccentSurfaceSoftHover = 'hover:bg-accent/10';
const themeAccentTextHover = 'hover:text-accent-hover';
const themeAccentTextHoverStrong = 'hover:text-accent';
const themeAccentFocusWithinRingSoft = 'focus-within:ring-accent/50';
const themeAccentFocusVisibleRingSoft = 'focus-visible:ring-accent/40';
const themeAccentSpinnerTopBorder = 'border-t-accent';
const themeAccentSpinnerBottomBorder = 'border-b-accent';
const themeAccentRailBorder = 'border-accent/70';

/**
 * Muted control label that brightens to {@link dashboardTextPrimary} on hover
 * (filter toggles, checklist actions, inline text buttons).
 */
export const dashboardControlTextMutedHoverPrimary = `text-fg-secondary ${hoverTextPrimaryOnDark} transition-colors`;

/**
 * Square icon control for “back” in page title rows ({@link BackNavButton}).
 * Pair with `fa-arrow-left` at `text-sm` (see layout `BackNavButton.svelte`).
 */
export const backNavButton = `inline-flex items-center justify-center w-8 h-8 border border-edge-strong/50 rounded-lg text-fg-muted hover:bg-surface-raised/50 ${hoverTextPrimaryOnDark} transition-colors shrink-0`;

// --- Form inputs (solid fills: avoid nested backdrop-filter inside frosted drawer/modal shells) ---

const inputGlassCore = `px-3 py-1.5 border border-edge/80 rounded-xl bg-surface/80 ${textPrimaryOnDark} focus:ring-2 ${themeAccentFocusRingSoft} outline-none focus:outline-none transition-colors text-sm`;

/** Standard search/select text field (add `inputGlassSearchSuffix` when a search icon sits on the right). */
export const inputGlass = `w-full ${inputGlassCore}`;

/** Same surface as {@link inputGlass} without full width (e.g. native `<select>` in a flex row). */
export const inputGlassAuto = inputGlassCore;

export const inputGlassSearchSuffix = 'pr-8';

export const inputGlassSearch = `${inputGlass} ${inputGlassSearchSuffix}`;

/**
 * Dashboard list search field (`SearchBar`): leading icon slot via `pl-10`, solid fill for frosted canvas.
 */
export const searchBarInput = `w-full pl-10 pr-4 py-2 text-sm font-inter border border-edge/80 rounded-xl bg-surface/80 ${textPrimaryOnDark} focus:ring-2 ${themeAccentFocusRing} focus:outline-none focus:border-transparent placeholder:text-fg-dimmed shadow-inner transition-colors`;

/**
 * Compact text field embedded in flex rows (e.g. constraint value beside chips).
 */
export const inputGlassDense = `flex-1 min-w-0 px-2 py-1 rounded-xl border border-edge/80 text-sm bg-surface/80 ${textPrimaryOnDark} focus:ring-2 ${themeAccentFocusRingSoft} outline-none focus:outline-none transition-colors`;

/**
 * Object drawer: description textarea uses slightly taller padding than {@link textareaInsideFrostedPanel}.
 */
export const textareaObjectForm = `w-full px-3 py-2 rounded-xl border border-edge/80 bg-surface/80 ${textPrimaryOnDark} focus:ring-2 ${themeAccentFocusRingSoft} outline-none focus:outline-none transition-colors`;

/**
 * `DefaultValueInput` outer shell (focus ring wraps control + preset pill).
 */
export const defaultValueComboShell =
	`flex items-center w-full rounded-xl border border-edge/80 bg-surface/80 focus-within:ring-2 ${themeAccentFocusWithinRingSoft} focus-within:outline-none transition-colors overflow-hidden`;

/**
 * Validator template gallery / form: muted `border-edge-strong` controls used inside frosted drawers.
 */
export const inputValidatorControl = `w-full px-3 py-1.5 border border-edge-strong text-sm focus:ring-2 ${themeAccentFocusRing} focus:border-transparent bg-surface/80 ${textPrimaryOnDark} transition-colors`;

export const inputValidatorSearch = `w-full px-3 py-2 border border-edge-strong rounded-xl text-sm bg-surface/80 ${textPrimaryOnDark} focus:ring-2 ${themeAccentFocusRing} focus:border-transparent transition-colors`;

/**
 * Member search inline on object form — accent focus ring variant, `pr-8` for icon.
 */
export const inputObjectMemberSearch = `w-full px-3 py-1.5 border border-edge/80 bg-surface/80 rounded-xl ${textPrimaryOnDark} focus:ring-2 ${themeAccentFocusRing} focus:border-transparent outline-none transition-colors text-sm pr-8`;

/**
 * Disabled read-only field — same shell and radius as {@link inputGlass}, muted text, no focus ring.
 * Use for locked context (e.g. namespace on API forms).
 */
export const inputGlassDisabled =
	'w-full px-3 py-1.5 border border-edge/80 rounded-xl bg-surface/70 text-fg-muted cursor-not-allowed text-sm outline-none';

/** Multiline control inside frosted drawer/modal (matches {@link inputGlass} rhythm, no blur). */
export const textareaInsideFrostedPanel = `w-full ${inputGlassCore}`;

/** Inset panel inside frosted drawer/modal — compose with spacing, e.g. `p-3 ${surfaceInsideFrostedPanel}`. */
export const surfaceInsideFrostedPanel = 'bg-surface/75 rounded-xl border border-edge/80';

/**
 * Full-width navigation row inside a drawer (jump to API detail).
 */
export const drawerLinkedEntityRow = `flex items-center space-x-2 w-full px-3 py-2 ${surfaceInsideFrostedPanel} hover:border-edge-strong hover:bg-surface-overlay transition-colors text-left`;

/** Compact row showing a selected entity (e.g. object picker). */
export const objectSelectorDisplayRow =
	'w-full px-3 border border-edge/80 rounded-xl bg-surface/80 shadow-inner flex items-center justify-between h-[34px]';

/**
 * Closed-state trigger for glass dropdown selects (`GlassSelectDropdown`) — same shell as
 * {@link objectSelectorDisplayRow} (native `<select>` cannot match this surface in WebKit/Blink).
 */
/** `glass-select-trigger` hover lives in `app.css` — do not add `hover:bg-surface-*` here (drawer body flatten rule). */
export const glassSelectTrigger =
	`glass-select-trigger w-full px-3 border border-edge/80 rounded-xl bg-surface/80 shadow-inner flex items-center justify-between gap-2 h-[34px] text-sm text-fg cursor-pointer focus:outline-none focus:ring-2 ${themeAccentFocusRingSoft} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`;

/** Shared shell for API generator 34px-high inputs (query/path param editors). */
const apiGeneratorRowControlCore = `w-full px-3 text-sm border border-edge/80 rounded-xl bg-surface/80 ${textPrimaryOnDark} focus:ring-2 ${themeAccentFocusRingSoft} outline-none focus:outline-none transition-colors h-[34px]`;

export const apiGeneratorRowInputMono = `${apiGeneratorRowControlCore} font-mono`;

/** Muted placeholder row when a linked control is unavailable (no object, etc.). */
export const apiGeneratorHintCell =
	'w-full px-3 py-1.5 text-sm border border-edge/80 rounded-xl bg-surface/80 text-fg-muted';

// --- Dropdowns / floating panels ---

/**
 * Opaque shell for floating dropdown lists (see `.dropdown-panel-solid-surface` in `app.css`).
 * Do not add Tailwind `bg-surface-*` to the same element — `.drawer-transparent-context` flattens those to the inner surface tint.
 */
export const dropdownPanelSolidSurface = 'dropdown-panel-solid-surface';

/**
 * List body for controls inside drawers / forms. Page-level menus: {@link popoverGlassMenuChrome}.
 */
export const dropdownPanel = `absolute z-30 w-full mt-1 max-h-60 overflow-hidden flex flex-col ${dropdownPanelSolidSurface}`;

export const dropdownPanelMessage = `absolute z-30 w-full mt-1 ${dropdownPanelSolidSurface}`;

export const dropdownListScroll = 'min-h-0 overflow-y-auto';

/**
 * List row — `dropdown-list-row` hover is defined in `app.css`.
 * Do not use Tailwind `hover:bg-surface-*` on these elements: `.drawer-body-scroll` flattens that utility to `--drawer-inner-surface-bg`, which hides hover.
 */
export const dropdownRow = `dropdown-list-row w-full px-3 py-2 text-left cursor-pointer border-b border-edge last:border-b-0 transition-colors ${hoverTextPrimaryOnDark}`;

export const listMetaBadge = 'text-xs text-fg-muted bg-surface-raised px-2 py-0.5 rounded-lg';

/**
 * Icon-only row remove control (`fa-solid fa-xmark`). Use for delete/unlink in form and generator rows.
 * Keeps destructive inline actions visually consistent (see CLAUDE.md form standards).
 */
export const inlineRemoveIconButton =
	'p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors shrink-0';

export const dropdownCreateRow = `dropdown-create-row w-full text-left px-3 py-2 text-sm text-fg-muted ${hoverTextPrimaryOnDark} rounded-lg cursor-pointer flex items-center space-x-2`;

// --- API generator: query parameters (matches QueryParamRow glass cells) ---

/** Read-only cell for locked pagination rows (limit / offset / operator) — same height and radius as editable inputs */
export const queryParamReadonlyCell =
	'w-full px-3 text-sm border border-edge/80 rounded-xl bg-surface/80 text-fg-muted cursor-not-allowed flex items-center h-[34px]';

export const queryParamPaginationDivider = 'border-t border-edge/80 pt-1.5';

export const queryParamPaginationToggleBase =
	'text-xs px-2 py-1.5 rounded-xl border font-inter font-medium transition-colors flex items-center space-x-1';

export const queryParamPaginationToggleOff = `text-fg-muted border-edge-strong/80 ${hoverTextPrimaryOnDark} hover:border-edge-hover hover:bg-surface-raised/40`;

export const queryParamPaginationToggleOn = 'text-red-400 border-red-400/40 hover:bg-red-400/10';

/** Small label for synthetic query param kind (e.g. built-in pagination) */
export const queryParamBuiltinBadge =
	'text-[10px] text-fg-dimmed bg-surface-raised/60 border border-edge/50 px-1.5 py-0.5 rounded-lg uppercase tracking-wide font-inter';

// --- Segmented toggles (two-state / N-state pill rows) ---

export const segmentFieldBase = 'px-3 py-1.5 text-sm border transition-colors first:rounded-l-xl last:rounded-r-xl';

export const segmentFieldBaseJoin =
	'px-3 py-1.5 text-sm border transition-colors border-l-0 first:rounded-l-xl last:rounded-r-xl';

export const segmentFieldInactive = 'bg-surface/75 text-fg-muted border-edge-strong hover:border-edge-hover';

export const segmentFieldActive = `${themeAccentFill} text-fg-on-accent font-bold ${themeAccentBorder}`;

export const segmentPillBase =
	'px-5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors text-center first:rounded-l-xl last:rounded-r-xl';

export const segmentPillSelected = `bg-surface/75 ${themeAccentText} border ${themeAccentBorderStrong}`;

export const segmentPillUnselected =
	'bg-surface/75 text-fg-muted border border-edge hover:border-edge-hover hover:text-fg-secondary';

export const segmentPillUnselectedLocked = 'bg-surface/75 text-fg-dimmed border border-edge';

// --- Cards (dashboard, stats) ---

/**
 * Dashboard / settings card frost — `.dashboard-card-glass` in `app.css` (same tokens as drawer shell, `--dashboard-card-radius`).
 */
export const dashboardCardGlass = 'dashboard-card-glass';

export const cardGlassSurface = dashboardCardGlass;

/** Chrome uses {@link dashboardCardGlass}; no extra border utility. */
export const cardGlassBorderDefault = '';

export const cardGlassBorderError = 'border border-red-400/30 bg-red-950/10';

/** Onboarding callout on dashboard — same frost as {@link cardGlassSurface}. */
export const cardOnboardingShell = `${dashboardCardGlass} p-6`;

// --- Accent tiles (icons) ---

export const accentIconTile =
	`rounded-xl ${themeAccentIconBadge} shadow-glow-accent-icon`;

export const accentIconTileError = 'rounded-xl bg-red-400/10 text-red-400 flex items-center justify-center';

// --- Sidebar ---

const sidebarShellBase = 'text-fg-secondary font-inter flex flex-col shrink-0 overflow-hidden';

export const sidebarShell = `${sidebarShellBase} transition-[width] duration-[400ms]`;

export const sidebarShellMotionLocked = sidebarShellBase;

/** Horizontal rule between nav groups in collapsed (icon-only) mode */
export const sidebarSectionDividerHorizontal = 'border-t border-edge-faint/60 my-2';

export const sidebarNavItemBase =
	'flex w-full min-h-11 items-center cursor-pointer transition-all rounded-l-none rounded-r-xl';

/** Active nav row: real frost via `.sidebar-nav-item-active-glass` in `app.css` (40px blur + saturate, not Tailwind `backdrop-blur-sm`). */
export const sidebarNavItemActive = `sidebar-nav-item-active-glass ${textPrimaryOnDark}`;

export const sidebarNavItemInactive = `hover:bg-surface-raised/50 ${hoverTextPrimaryOnDark} border border-transparent`;

// --- Dashboard main column (sidebar right pane) ---

/** Fills the flex slot next to the sidebar; enables scroll inside the body. */
export const dashboardMainColumn = 'flex flex-col flex-1 min-h-0 w-full';

/**
 * Layered dashboard accent wash: top-right radial over matching linear washes — bottom-to-top and
 * left-to-right (same stops, `transparent` into `bg-surface-base`). First image in the list paints on top.
 */
export const dashboardGreenWashGradient =
	'bg-[radial-gradient(ellipse_82%_68%_at_100%_0%,rgb(82_226_140/0.04)_0%,rgb(82_226_140/0.013)_50%,transparent_82%),linear-gradient(to_top,rgb(74_222_128/0.035),rgb(74_222_128/0.01)_45%,transparent),linear-gradient(to_right,rgb(74_222_128/0.022),rgb(74_222_128/0.006)_45%,transparent)]';

/**
 * Full dashboard viewport background: `surface-base` plus combined wash (same for every route).
 * Signature retains `pathname` for call sites that pass `page.url.pathname`; reserved for future tuning.
 */
export function dashboardMainColumnCanvasForPath(_pathname: string): string {
	return `bg-surface-base ${dashboardGreenWashGradient}`;
}

/**
 * Static default canvas (= {@link dashboardMainColumnCanvasForPath} for routes that do not match a rule).
 * `(dashboard)` layout should prefer {@link dashboardMainColumnCanvasForPath}.
 */
export const dashboardMainColumnCanvas = `bg-surface-base ${dashboardGreenWashGradient}`;

/**
 * Page header band (title row + actions): no border or separate glass so it blends with `dashboardMainColumnCanvas`.
 * Matches sidebar brand row: `p-4` + 48px content band.
 */
export const dashboardPageHeaderShell = 'relative z-[60] w-full shrink-0 py-4 px-4';

/** Horizontal padding for search / toolbars under the page header (keep in sync with `dashboardPageHeaderShell`). */
export const mainColumnChromePaddingX = 'px-4';

/**
 * Search + filter row directly under `PageHeader` (see `SearchBar`).
 * No second glass strip or border — flows with `dashboardMainColumnCanvas`.
 */
export const dashboardSearchToolbarShell = 'relative z-50 w-full shrink-0 py-4';

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
export const headerMetaSeparator = 'text-fg-faint shrink-0 hidden sm:inline';

/**
 * Namespace cluster (layer icon + name) — API detail + drawer headers; `text-sm` for readability in drawers.
 */
export const headerNamespaceCluster =
	'hidden sm:inline-flex items-center gap-1.5 text-sm text-fg-muted shrink-0 max-w-[10rem] truncate';

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
export const tableListBodyDivide = 'divide-y divide-edge-faint/30';

/**
 * Sticky table header: transparent; only a row rule separates header from body.
 */
export const tableListThead = 'sticky top-0 z-10 bg-transparent border-b border-edge-faint/30';

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
export const tableListBodyCaption = 'text-xs text-fg-muted';

/** Underlined link inside list tables or list-drawer detail (documentation URLs). */
export const tableListBodyLink = `text-sm ${dashboardTextPrimary} underline hover:text-fg-secondary transition-colors`;

/**
 * Clickable entity title in a card or panel (e.g. API readiness) — hover uses the shared accent token.
 */
export const tableListEntityTitleButton =
	`text-base font-inter font-bold text-fg ${themeAccentTextHoverStrong} transition-colors cursor-pointer truncate block`;

/**
 * Muted inline label in auxiliary rows (validator parameter / field-mapping titles).
 */
export const tableListAuxiliaryLabel = 'text-sm text-fg-secondary font-medium';

/** Primary name line in a drawer opened from a list row (`DetailField` value). Alias of {@link tableListBodyPrimary}. */
export const tableListDetailTitle = tableListBodyPrimary;

/**
 * Section heading inside a list-row drawer (namespace info panels, etc.).
 */
export const tableListPanelSectionTitle = `${tableListAuxiliaryLabel} mb-2`;

/** Left or inline label for summary stats (“Total”) under a list selection. */
export const tableListPanelStatLabel = 'text-fg-secondary font-medium';

/** Emphasized total / rollup number in those stat blocks. */
export const tableListPanelStatTotal = `${dashboardTextPrimary} font-bold`;

export const tableListRowInteractive = 'cursor-pointer transition-colors';

export const tableListRowHover = 'hover:bg-surface/70';

export const tableListRowSelected = 'bg-surface-raised';

// --- Drawer stack ---

/** Overlay behind drawers — visual values come from `.drawer-scrim` in `app.css`. */
export const drawerScrim = 'drawer-scrim fixed top-0 right-0 h-screen z-[60]';

/** Root wrapper for the shared drawer overlay stack. */
export const drawerStackRoot =
	'drawer-stack-root fixed right-0 top-0 h-screen z-[70] flex justify-end pointer-events-none';

/**
 * Shared frosted shell for drawer panels (see `.drawer-panel-glass-surface` in `app.css` for blur + fill).
 */
export const drawerPanelGlassSurface = 'drawer-panel-glass-surface';

/**
 * Anchored popovers on list/dashboard chrome (namespace menu, filter panel). Opaque shell — same as {@link dropdownPanelSolidSurface}.
 */
export const popoverGlassMenuChrome = `${dropdownPanelSolidSurface} z-[100] overflow-hidden font-inter`;

/**
 * Drawer panel shell (outer): visual chrome comes from `.drawer-panel-glass-surface` in `app.css`.
 * Keep overflow clipping on the inner wrapper so shell treatment stays centralized.
 */
export const drawerPanelFlexibleOuter = `h-[calc(100vh-32px)] m-4 flex min-h-0 flex-col ${drawerPanelGlassSurface} relative pointer-events-auto`;

/** Scroll clip + column layout inside {@link drawerPanelFlexibleOuter} / {@link drawerPanelStackedOuter}. */
export const drawerPanelFlexibleInner =
	'drawer-transparent-context flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]';

export const drawerPanelStackedOuter = `flex h-[calc(100vh-32px)] min-h-0 flex-shrink-0 flex-col ${drawerPanelGlassSurface} relative my-4 mr-4 pointer-events-auto`;

export const drawerPanelStackedInner = drawerPanelFlexibleInner;

/** Stacked-panel dimmer — visual values come from `.drawer-stack-dimmer` in `app.css`. */
export const drawerStackDimmer = 'drawer-stack-dimmer absolute inset-0 z-10 pointer-events-none rounded-[inherit]';

/**
 * Scrollable drawer body. Class `drawer-body-scroll` scopes drawer-context hover overrides in `app.css`
 * so footer segment hovers are not flattened.
 */
export const drawerBodyScrollArea = 'drawer-body-scroll flex-1 overflow-auto p-6';

/**
 * Centered modal panels — same frosted shell as `DrawerStack` so all overlay forms match.
 */
export const modalPanelGlassSurface = drawerPanelGlassSurface;

/**
 * Native `<dialog>::backdrop` — same scrim tokens as {@link drawerScrim} (see `.modal-dialog-scrim` in `app.css`).
 */
export const modalDialogBackdropClass = 'modal-dialog-scrim';

/**
 * Inner clip + nested `bg-surface-*` overrides inside modal glass (mirrors drawer flexible inner, without flex column).
 */
export const modalPanelTransparentInner = 'drawer-transparent-context overflow-hidden rounded-[inherit]';

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
export const drawerFooterSegmentedPanel = 'drawer-footer-segmented-panel flex flex-col sm:flex-row overflow-hidden';

/** Separator between {@link drawerFooterSegmentBtn} cells (horizontal rule when stacked, vertical in row layout). */
export const drawerFooterSegmentDivider = 'shrink-0 h-px sm:h-auto sm:self-stretch sm:w-px bg-surface-overlay/80';

/**
 * Segment control inside {@link drawerFooterSegmentedPanel}. Combine with {@link drawerFooterBtnPrimaryEnabled} and friends.
 */
export const drawerFooterSegmentBtn =
	`inline-flex items-center justify-center gap-2 w-full sm:flex-1 min-w-0 px-3 py-3 text-sm font-inter tracking-wide transition-colors outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset ${themeAccentFocusVisibleRingSoft}`;

export const drawerFooterBtnPrimaryEnabled =
	`${themeAccentFill} border-transparent text-fg-on-accent font-semibold shadow-sm ${themeAccentFillHover} hover:shadow-md cursor-pointer`;

/** Box matches enabled primary; typography matches muted secondary so disabled Save/Undo read as a pair. */
export const drawerFooterBtnPrimaryDisabled =
	'font-medium bg-surface-raised border-edge text-fg-muted cursor-not-allowed shadow-sm';

/** Primary disabled segment inside {@link drawerFooterSegmentedPanel} (panel border only). */
export const drawerFooterBtnPrimaryDisabledSegment =
	'font-medium bg-surface-raised text-fg-muted cursor-not-allowed shadow-sm';

export const drawerFooterBtnSecondary =
	'border border-edge-strong text-fg-secondary transition-colors font-medium font-inter tracking-wide hover:bg-surface-raised cursor-pointer';

/** Secondary segment inside {@link drawerFooterSegmentedPanel} (no per-cell border). */
export const drawerFooterBtnSecondarySegment =
	'text-fg-secondary transition-colors font-medium font-inter tracking-wide hover:bg-surface-overlay/55 hover:text-fg cursor-pointer';

export const drawerFooterBtnSecondaryMuted =
	'border border-edge text-fg-muted font-medium cursor-not-allowed bg-surface-raised shadow-sm';

/** Muted secondary for segmented footer cells. */
export const drawerFooterBtnSecondarySegmentMuted =
	'text-fg-muted font-medium cursor-not-allowed bg-surface-raised/80 shadow-sm';

/** Undo segment — amber accent (enabled). */
export const drawerFooterBtnUndoSegment =
	'text-amber-300 transition-colors font-medium font-inter tracking-wide hover:bg-amber-400/20 hover:text-amber-100 cursor-pointer';

/** Undo segment when changes cannot be reverted (neutral muted; not amber). */
export const drawerFooterBtnUndoSegmentMuted =
	'text-fg-muted font-medium font-inter tracking-wide cursor-not-allowed bg-surface-raised/80 shadow-sm';

/** Duplicate segment — blue accent (enabled). */
export const drawerFooterBtnDuplicateSegment =
	'text-blue-300 transition-colors font-medium font-inter tracking-wide hover:bg-blue-400/20 hover:text-blue-100 cursor-pointer';

/** Duplicate segment when the control is inactive (e.g. save in flight). */
export const drawerFooterBtnDuplicateSegmentMuted =
	'text-fg-muted font-medium font-inter tracking-wide cursor-not-allowed bg-surface-raised/80 shadow-sm';

/** Full-width Delete control in drawer footers (paired with {@link drawerFooterBtnDestructiveDisabled}). */
export const drawerFooterBtnDestructive =
	'bg-red-400/10 border-transparent text-red-400 hover:bg-red-400/25 hover:text-red-200 cursor-pointer';

export const drawerFooterBtnDestructiveDisabled = 'bg-surface-overlay border-edge text-fg-muted cursor-not-allowed';

/** Destructive segment disabled (no extra border; {@link drawerFooterSegmentDivider} separates cells). */
export const drawerFooterBtnDestructiveDisabledSegment = 'bg-surface-raised/90 text-fg-muted cursor-not-allowed';

/** Full-width prompt above segmented delete confirmation (edge-aligned with drawer footer). */
export const drawerFooterDeleteConfirmBanner =
	'px-3 py-2.5 text-sm font-medium text-red-400 bg-red-400/10 border-b border-edge/80 font-inter tracking-wide';

/** Destructive confirm segment in {@link drawerFooterSegmentedPanel} (e.g. Yes, delete). */
export const drawerFooterBtnDangerConfirmSegment =
	'bg-red-600 text-white font-semibold shadow-sm hover:bg-red-700 hover:shadow-md cursor-pointer border-transparent';

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
	'flex-1 px-3 py-1.5 rounded-xl border text-sm font-medium font-inter tracking-wide transition-colors border-edge-strong text-fg-secondary hover:bg-surface-raised cursor-pointer';

export const drawerFooterBtnDangerCancelBusy =
	'flex-1 px-3 py-1.5 rounded-xl border text-sm font-medium font-inter tracking-wide transition-colors border-edge text-fg-muted cursor-not-allowed bg-surface-raised';

export const btnCtaGlow =
	`px-5 py-2.5 ${themeAccentFill} text-fg-on-accent font-inter font-semibold rounded-xl text-sm ${themeAccentFillHover} transition-all shadow-glow-accent cursor-pointer`;

export const btnGenerateSm =
	`text-xs px-4 py-1.5 rounded-lg ${themeAccentFill} text-fg-on-accent font-inter font-bold ${themeAccentFillHover} transition-colors cursor-pointer flex items-center space-x-1 shadow-glow-accent-sm`;

export const btnEmptyStatePrimary =
	`mt-5 px-6 py-2.5 ${themeAccentFill} text-fg-on-accent font-inter font-bold rounded-2xl tracking-wide shadow-glow-accent ${themeAccentFillHover} transition-all cursor-pointer`;

// --- Modal dialogs (inline footer row, not full-width like drawer) ---

export const modalFooterBtnSecondary =
	'px-4 py-2 rounded-xl border border-edge-strong text-fg-secondary font-inter font-medium text-sm transition-colors';

export const modalFooterBtnPrimary =
	'px-4 py-2 rounded-xl font-inter font-semibold text-sm tracking-wide flex items-center space-x-2 transition-colors';

export const modalFooterBtnPrimaryEnabled =
	`${themeAccentFill} text-fg-on-accent ${themeAccentFillHover} cursor-pointer shadow-glow-accent-sm`;

export const modalFooterBtnPrimaryDisabled = 'bg-surface-overlay text-fg-muted cursor-not-allowed';

/** Inline error callout (e.g. Generate dialog) */
export const modalInlineError = 'bg-red-400/10 border border-red-400/30 p-3 mb-4 rounded-xl';

/** Checkbox / radio inside frosted modal — solid fill, no nested blur */
export const modalFormCheckbox =
	themeAccentCheckbox;

export const modalFormRadio = `w-3.5 h-3.5 ${themeAccentText} border-edge-strong bg-surface ${themeAccentFocusRing}`;

/** Full-width primary action in validator template form (inside frosted drawer). */
export const validatorTemplateFormSubmitButton =
	`w-full px-4 py-2 ${themeAccentFill} text-fg-on-accent font-bold text-sm tracking-wide ${themeAccentFillHover} transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`;

// --- Dashboard loading shell ---

export const dashboardLoadingRoot = 'flex h-screen items-center justify-center bg-surface-base';

export const dashboardLoadingLabel = 'mt-4 text-fg-muted font-inter text-sm font-medium';

/** Full-page or route-blocking spinner; ring uses the shared accent token. */
export const dashboardBlockingSpinner =
	`animate-spin rounded-full h-8 w-8 border-2 border-transparent ${themeAccentSpinnerTopBorder} mx-auto opacity-80`;

/**
 * Primary “Create …” / “Add …” in dashboard list page headers (semantic accent token).
 */
export const dashboardPageHeaderPrimaryButton =
	`inline-flex items-center gap-2 px-4 py-2 ${themeAccentFill} text-fg-on-accent font-inter font-semibold rounded-xl text-sm tracking-wide shadow-sm ${themeAccentFillHover} cursor-pointer transition-colors`;

/**
 * Large blurred wash behind sign-in / sign-up cards (same accent as marketing orbs).
 */
export const authPageAccentGlowOrb =
	`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] opacity-[0.12] ${themeAccentFill} blur-[120px] rounded-full pointer-events-none`;

/** Clerk-style spinner on auth pages (`border-b` accent). */
export const authPageInlineSpinner = `animate-spin rounded-full h-8 w-8 border-b-2 ${themeAccentSpinnerBottomBorder} mx-auto opacity-80`;

/** API list card: “ready to generate” status chip (accent from theme). */
export const apiReadinessStatusReadyClasses = `${themeAccentText} ${themeAccentSurfaceSoft} ${themeAccentBorderSoft}`;

// --- Marketing (landing) ---

export const marketingHeader = 'bg-surface-base/80 backdrop-blur-md border-b border-edge-faint/60 sticky top-0 z-50';

export const marketingMobileMenu = 'md:hidden border-t border-edge-faint/60 bg-surface-base/95 backdrop-blur-xl';

export const marketingNavLink = 'text-fg-muted hover:text-white font-inter font-medium text-sm transition-colors';

export const marketingNavLinkMobile = `block text-fg-muted ${hoverTextPrimaryOnDark} font-inter font-medium text-base py-3 transition-colors`;

/** Header / compact CTAs: same corner radius as in-page buttons (`rounded-xl`), denser padding for the top bar */
const marketingNavCtaShell =
	'inline-flex items-center justify-center px-5 py-2.5 min-h-[40px] font-inter font-medium text-sm rounded-xl';

export const marketingCtaOutline = `${marketingNavCtaShell} ${themeAccentText} border ${themeAccentBorderStrong} ${themeAccentSurfaceSoftHover} transition-colors`;

export const marketingCtaPrimary = `${marketingNavCtaShell} ${themeAccentFill} text-fg-on-accent ${themeAccentFillHover} transition-colors shadow-glow-accent`;

export const marketingBetaPill =
	`inline-flex items-center space-x-2 ${themeAccentSurfaceSoft} px-3 py-1.5 rounded-full border ${themeAccentBorderSoft} shadow-glow-accent-sm`;

export const marketingBetaDot = `w-1.5 h-1.5 ${themeAccentFill} rounded-full animate-pulse shadow-glow-accent-dot`;

/** Hero, final CTA, and paired outline buttons share one geometry so adjacent rows align */
const marketingLgCtaShell =
	'inline-flex items-center justify-center px-8 py-3.5 min-h-[48px] font-inter font-semibold text-base rounded-xl';

export const marketingHeroCta = `${marketingLgCtaShell} ${themeAccentFill} text-fg-on-accent shadow-glow-accent-lg hover:shadow-glow-accent-xl ${themeAccentFillHover} transition-all`;

export const marketingHeroCtaSecondary = `${marketingLgCtaShell} bg-surface/50 backdrop-blur-sm text-white border border-edge-faint hover:bg-surface-raised/80 transition-all`;

export const marketingFooterCta = `${marketingLgCtaShell} ${themeAccentFill} text-fg-on-accent shadow-glow-accent-lg hover:shadow-glow-accent-xl ${themeAccentFillHover} transition-all`;

/** Tertiary / sign-in next to primary in closing section — same box as `marketingFooterCta` */
export const marketingFooterCtaSecondary = `${marketingLgCtaShell} border border-edge/80 text-fg-secondary hover:text-white hover:bg-surface/40 transition-all`;

export const marketingFeatureIcon =
	`w-12 h-12 ${themeAccentIconBadge} rounded-xl mb-6 shadow-glow-accent-icon`;

/**
 * Step column: index + rail row; index sits left of the copy (see {@link marketingHowItWorksWatermark}).
 */
export const marketingHowItWorksStepColumn = 'relative flex items-start gap-3 pb-2 sm:gap-5 overflow-visible';

/**
 * Ghost 01–03: Inter, left of the rail; larger than prior upper-right watermark, pairs with slightly dropped copy in {@link marketingHowItWorksStepBody}.
 */
export const marketingHowItWorksWatermark =
	'pointer-events-none z-0 shrink-0 select-none whitespace-nowrap text-left font-inter font-black leading-none tracking-tighter text-fg-faint/35 tabular-nums text-[clamp(5rem,11.25vw,8.875rem)]';

/** Green rail + step copy (foreground); top padding lowers title/body vs the index cap height. */
export const marketingHowItWorksStepBody =
	`relative z-10 min-w-0 flex-1 border-l-2 ${themeAccentRailBorder} pl-4 sm:pl-5 pt-2 sm:pt-2.5`;

/** Step title — same rhythm as feature cards. */
export const marketingHowItWorksStepTitle = 'mb-3 font-inter text-lg font-semibold text-white tracking-wide';

export const marketingProgressBarGlow = 'shadow-glow-accent-bar';

// --- Clerk appearance.elements (class strings; `clerk.ts` variables from `appTheme.ts`) ---

export const clerkCard = 'bg-surface-base/60 backdrop-blur-xl border border-edge-faint/80 rounded-3xl shadow-2xl';

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
export const clerkUserButtonPopoverFooter = 'bg-surface-base/25 border-t border-white/10';

export const clerkFormButtonPrimary =
	`${themeAccentFill} text-fg-on-accent ${themeAccentFillHover} font-inter font-semibold tracking-wide rounded-xl shadow-glow-accent`;

export const clerkFormFieldInput = `bg-surface/50 border border-edge/80 ${textPrimaryOnDark} rounded-xl`;

export const clerkAvatarBox = 'border border-edge-faint/80 rounded-full';

export const clerkFooterActionLink = `${themeAccentText} ${themeAccentTextHover}`;

export const clerkSocialGithub = '[&>img]:invert';

export const clerkNavbar = 'bg-surface/50 border-r border-edge-faint/80';

export const clerkNavbarButton = `text-fg-secondary ${hoverTextPrimaryOnDark} hover:bg-surface-raised/50 data-[active=true]:bg-surface-raised/50 data-[active=true]:${textPrimaryOnDark} rounded-lg transition-colors`;

export const clerkPageScrollBox = 'bg-surface-base/40';

export const clerkProfileSectionBorder = 'border-b border-edge-faint/80';

export const clerkProfileSectionDanger = 'border-b border-red-500/30';

export const clerkProfileSectionTitle = `${textPrimaryOnDark} font-inter font-semibold`;

export const clerkProfileSectionContent = 'text-fg-secondary font-inter';

export const clerkProfilePrimaryButton = `${themeAccentText} ${themeAccentTextHover}`;

export const clerkBadge = 'bg-surface-raised/50 text-fg-secondary border border-edge/60 rounded-full';

export const clerkModalClose = `text-fg-muted ${hoverTextPrimaryOnDark} transition-colors`;

/** Same scrim layer as {@link drawerScrim} / native {@link modalDialogBackdropClass}. */
export const clerkModalBackdrop = 'drawer-scrim';

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

export const clerkHeaderSubtitle = 'text-fg-muted font-inter';

export const clerkFormFieldLabel = 'text-fg-secondary font-inter';

export const clerkAccordionTrigger = `text-fg-secondary ${hoverTextPrimaryOnDark}`;

export const clerkBreadcrumbs = 'text-fg-muted font-inter';

export const clerkBreadcrumbsItem = `text-fg-muted ${hoverTextPrimaryOnDark} transition-colors`;

export const clerkBreadcrumbsDivider = 'text-fg-faint';
