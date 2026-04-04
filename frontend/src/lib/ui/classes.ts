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
 * | Dashboard column shell & page header chrome | — | `dashboardMainColumn`, `dashboardMainColumnCanvas`, `dashboardGreenWashGradient`, `dashboardPageHeaderShell`, `dashboardSearchToolbarShell`, `mainColumnChromePaddingX`, `dashboardPageHeaderTitleBand`, `headerMetaSeparator`, `headerNamespaceCluster` |
 * | Dashboard entity list tables | — | `tableListPageGutter`, `tableListCardShell`, `tableListBodyDivide`, `tableListCell`, `tableListRowInteractive`, `tableListRowHover`, `tableListRowSelected` |
 * | Drawer & modal frosted shells | `drawer-deep` | `drawerPanelGlassSurface`, `modalPanelGlassSurface`, `drawerPanelFlexible`, `drawerPanelStacked`, `drawerScrim`, `drawerLinkedEntityRow`, … |
 * | Primary / secondary / destructive | `glow-green` | `drawerFooterBtnPrimary*`, `drawerFooterBtnDestructive*`, `drawerFooterDangerCallout`, `drawerFooterBtnDangerConfirm*`, `modalFooterBtn*`, `btnCtaGlow`, … |
 * | Marketing landing | `glow-*` | `marketingCtaPrimary` (nav), `marketingHeroCta` + `marketingHeroCtaSecondary`, `marketingFooterCta` + `marketingFooterCtaSecondary` |
 * | Clerk `appearance.elements` | `glow-green` | `clerkCard`, `clerkFormButtonPrimary`, … |
 */

// --- Form inputs (solid fills: avoid nested backdrop-filter inside frosted drawer/modal shells) ---

const inputGlassCore =
  'px-3 py-1.5 border border-mono-700/80 rounded-xl bg-mono-900/80 text-white focus:ring-2 focus:ring-green-400/50 outline-none focus:outline-none transition-colors text-sm';

/** Standard search/select text field (add `inputGlassSearchSuffix` when a search icon sits on the right). */
export const inputGlass = `w-full ${inputGlassCore}`;

/** Same surface as {@link inputGlass} without full width (e.g. native `<select>` in a flex row). */
export const inputGlassAuto = inputGlassCore;

export const inputGlassSearchSuffix = 'pr-8';

export const inputGlassSearch = `${inputGlass} ${inputGlassSearchSuffix}`;

/**
 * Dashboard list search field (`SearchBar`): leading icon slot via `pl-10`, solid fill for frosted canvas.
 */
export const searchBarInput =
  'w-full pl-10 pr-4 py-2 text-sm font-inter border border-mono-700/80 rounded-xl bg-mono-900/80 text-mono-100 focus:ring-2 focus:ring-green-400 focus:outline-none focus:border-transparent placeholder:text-mono-500 shadow-inner transition-colors';

/**
 * Compact text field embedded in flex rows (e.g. constraint value beside chips).
 */
export const inputGlassDense =
  'flex-1 min-w-0 px-2 py-1 rounded-xl border border-mono-700/80 text-sm bg-mono-900/80 text-white focus:ring-2 focus:ring-green-400/50 outline-none focus:outline-none transition-colors';

/**
 * Object drawer: description textarea uses slightly taller padding than {@link textareaInsideFrostedPanel}.
 */
export const textareaObjectForm =
  'w-full px-3 py-2 rounded-xl border border-mono-700/80 bg-mono-900/80 text-white focus:ring-2 focus:ring-green-400/50 outline-none focus:outline-none transition-colors';

/**
 * `DefaultValueInput` outer shell (focus ring wraps control + preset pill).
 */
export const defaultValueComboShell =
  'flex items-center w-full rounded-xl border border-mono-700/80 bg-mono-900/80 focus-within:ring-2 focus-within:ring-green-400/50 focus-within:outline-none transition-colors overflow-hidden';

/**
 * Validator template gallery / form: muted `border-mono-600` controls used inside frosted drawers.
 */
export const inputValidatorControl =
  'w-full px-3 py-1.5 border border-mono-600 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent bg-mono-900/80 text-mono-100 transition-colors';

export const inputValidatorSearch =
  'w-full px-3 py-2 border border-mono-600 rounded-xl text-sm bg-mono-900/80 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent transition-colors';

/**
 * Member search inline on object form — green focus ring variant, `pr-8` for icon.
 */
export const inputObjectMemberSearch =
  'w-full px-3 py-1.5 border border-mono-700/80 bg-mono-900/80 rounded-xl text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none transition-colors text-sm pr-8';

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
const apiGeneratorRowControlCore =
  'w-full px-3 text-sm border border-mono-700/80 rounded-xl bg-mono-900/80 text-white focus:ring-2 focus:ring-green-400/50 outline-none focus:outline-none transition-colors h-[34px]';

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

export const dropdownCreateRow =
  'w-full text-left px-3 py-2 text-sm text-mono-400 hover:bg-mono-800 hover:text-mono-100 rounded-lg cursor-pointer flex items-center space-x-2';

// --- API generator: query parameters (matches QueryParamRow glass cells) ---

/** Read-only cell for locked pagination rows (limit / offset / operator) — same height and radius as editable inputs */
export const queryParamReadonlyCell =
  'w-full px-3 text-sm border border-mono-700/80 rounded-xl bg-mono-900/80 text-mono-400 cursor-not-allowed flex items-center h-[34px]';

export const queryParamPaginationDivider = 'border-t border-mono-700/80 pt-1.5';

export const queryParamPaginationToggleBase =
  'text-xs px-2 py-1.5 rounded-xl border font-inter font-medium transition-colors flex items-center space-x-1';

export const queryParamPaginationToggleOff =
  'text-mono-400 border-mono-600/80 hover:text-mono-100 hover:border-mono-500 hover:bg-mono-800/40';

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

export const sidebarShell =
  'text-mono-300 font-inter flex flex-col shrink-0 transition-[width] duration-[400ms] overflow-hidden';

/** Horizontal rule between nav groups in collapsed (icon-only) mode */
export const sidebarSectionDividerHorizontal = 'border-t border-mono-800/60 my-2';

export const sidebarNavItemBase =
  'flex w-full min-h-11 items-center cursor-pointer transition-all rounded-l-none rounded-r-xl';

export const sidebarNavItemActive = 'bg-mono-800/80 text-white shadow-sm border border-mono-700/50';

export const sidebarNavItemInactive = 'hover:bg-mono-800/50 hover:text-white border border-transparent';

// --- Dashboard main column (sidebar right pane) ---

/** Fills the flex slot next to the sidebar; enables scroll inside the body. */
export const dashboardMainColumn = 'flex flex-col flex-1 min-h-0 w-full';

/** Same horizontal green wash as the page header overlay (slightly softer than full /5). */
export const dashboardGreenWashGradient =
  'bg-gradient-to-r from-green-400/[0.035] to-transparent';

/**
 * Dashboard shell background: mono base plus left-edge green wash.
 * Use on the full-viewport `(dashboard)` flex root so the wash sits behind the transparent sidebar too.
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

/**
 * Middle dot before namespace meta — matches API detail title band (`hidden sm:inline` uses viewport breakpoint).
 */
export const headerMetaSeparator = 'text-mono-600 shrink-0 hidden sm:inline';

/**
 * Namespace cluster (layer icon + name) — API detail + drawer headers; `text-sm` for readability in drawers.
 */
export const headerNamespaceCluster =
  'hidden sm:inline-flex items-center gap-1.5 text-sm text-mono-400 shrink-0 max-w-[10rem] truncate';

// --- Dashboard entity list tables (Types, Fields, Objects, …) ---

/**
 * Outer wrapper for `Table`: horizontal alignment with `PageHeader` / `SearchBar`, bottom spacing above scroll end.
 */
export const tableListPageGutter = `${mainColumnChromePaddingX} pb-4 w-full min-h-0`;

/**
 * Glass card around the list table. Deliberately omits `cardGlassSurface` hover so the sheet does not brighten as a whole.
 */
export const tableListCardShell =
  'bg-mono-900/50 backdrop-blur-sm/40 rounded-2xl shadow-sm border border-mono-800/80 w-full overflow-hidden';

/** Low-contrast row rules between body rows (`<tbody>` with `divide-y`). */
export const tableListBodyDivide = 'divide-y divide-mono-800/30';

/** Standard `<th>` / `<td>` padding — matches `mainColumnChromePaddingX` rhythm. */
export const tableListCell = 'px-4 py-4';

export const tableListRowInteractive = 'cursor-pointer transition-colors';

export const tableListRowHover = 'hover:bg-mono-900/70';

export const tableListRowSelected = 'bg-mono-800';

// --- Drawer stack ---

/** Dims the page behind drawers; light enough that the green canvas still reads through the blur. */
export const drawerScrim =
  'fixed top-0 right-0 h-screen z-[60] bg-mono-950/45 backdrop-blur-[1.5px]';

/**
 * Shared frosted shell for drawer panels: low-opacity fill + strong blur so the UI behind smears visibly.
 * Specular border / inset ring approximates glass edge lighting on dark chrome.
 */
export const drawerPanelGlassSurface =
  'bg-mono-900/40 backdrop-blur-2xl backdrop-saturate-150 border border-white/10 shadow-drawer-deep ring-1 ring-inset ring-white/5';

export const drawerPanelFlexible =
  `h-[calc(100vh-32px)] m-4 flex flex-col ${drawerPanelGlassSurface} overflow-hidden relative rounded-3xl pointer-events-auto`;

export const drawerPanelStacked =
  `flex-shrink-0 h-[calc(100vh-32px)] my-4 mr-4 flex flex-col ${drawerPanelGlassSurface} overflow-hidden relative rounded-3xl pointer-events-auto`;

/** Covers the panel behind a stacked drawer without a second heavy blur. */
export const drawerStackDimmer = 'absolute inset-0 bg-mono-950/40 z-10 pointer-events-none';

/**
 * Centered modal panels — same frosted shell as `DrawerStack` so all overlay forms match.
 */
export const modalPanelGlassSurface = drawerPanelGlassSurface;

// --- Drawer footer & primary actions ---

export const drawerFooterBtnBlock =
  'w-full px-4 py-2 rounded-xl text-sm border font-inter tracking-wide transition-colors';

export const drawerFooterBtnPrimaryEnabled =
  'bg-green-400 border-transparent text-mono-950 font-semibold shadow-sm hover:bg-green-300 cursor-pointer';

/** Box matches enabled primary; typography matches muted secondary so disabled Save/Undo read as a pair. */
export const drawerFooterBtnPrimaryDisabled =
  'font-medium bg-mono-800 border-mono-700 text-mono-400 cursor-not-allowed shadow-sm';

export const drawerFooterBtnSecondary =
  'border border-mono-600 text-mono-300 transition-colors font-medium font-inter tracking-wide hover:bg-mono-800 cursor-pointer';

export const drawerFooterBtnSecondaryMuted =
  'border border-mono-700 text-mono-400 font-medium cursor-not-allowed bg-mono-800 shadow-sm';

/** Full-width Delete control in drawer footers (paired with {@link drawerFooterBtnDestructiveDisabled}). */
export const drawerFooterBtnDestructive =
  'bg-red-400/10 border-transparent text-red-400 hover:bg-red-400/20 cursor-pointer';

export const drawerFooterBtnDestructiveDisabled =
  'bg-mono-700 border-mono-700 text-mono-400 cursor-not-allowed';

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

export const marketingNavLinkMobile =
  'block text-mono-400 hover:text-mono-100 font-inter font-medium text-base py-3 transition-colors';

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

export const marketingStepBadge =
  'w-8 h-8 rounded-full bg-green-400/10 text-green-400 flex items-center justify-center mr-3 text-sm shadow-glow-green-sm';

export const marketingProgressBarGlow = 'shadow-glow-green-bar';

// --- Clerk appearance.elements (class strings; variables stay hex in clerk.ts) ---

export const clerkCard =
  'bg-mono-950/60 backdrop-blur-xl border border-mono-800/80 rounded-3xl shadow-2xl';

export const clerkFormButtonPrimary =
  'bg-green-400 text-mono-950 hover:bg-green-300 font-inter font-semibold tracking-wide rounded-xl shadow-glow-green';

export const clerkFormFieldInput = 'bg-mono-900/50 border border-mono-700/80 text-mono-100 rounded-xl';

export const clerkAvatarBox = 'border border-mono-800/80 rounded-full';

export const clerkFooterActionLink = 'text-green-400 hover:text-green-300';

export const clerkSocialGithub = '[&>img]:invert';

export const clerkNavbar = 'bg-mono-900/50 border-r border-mono-800/80';

export const clerkNavbarButton =
  'text-mono-300 hover:text-mono-100 hover:bg-mono-800/50 data-[active=true]:bg-mono-800/50 data-[active=true]:text-mono-100 rounded-lg transition-colors';

export const clerkPageScrollBox = 'bg-mono-950/40';

export const clerkProfileSectionBorder = 'border-b border-mono-800/80';

export const clerkProfileSectionDanger = 'border-b border-red-500/30';

export const clerkProfileSectionTitle = 'text-mono-100 font-inter font-semibold';

export const clerkProfileSectionContent = 'text-mono-300 font-inter';

export const clerkProfilePrimaryButton = 'text-green-400 hover:text-green-300';

export const clerkBadge = 'bg-mono-800/50 text-mono-300 border border-mono-700/60 rounded-full';

export const clerkModalClose = 'text-mono-400 hover:text-white transition-colors';

export const clerkModalBackdrop = 'bg-black/60 backdrop-blur-sm';

export const clerkHeaderTitle = 'text-mono-100 font-inter font-bold';

export const clerkHeaderSubtitle = 'text-mono-400 font-inter';

export const clerkFormFieldLabel = 'text-mono-300 font-inter';

export const clerkAccordionTrigger = 'text-mono-300 hover:text-mono-100';

export const clerkBreadcrumbs = 'text-mono-400 font-inter';

export const clerkBreadcrumbsItem = 'text-mono-400 hover:text-mono-100 transition-colors';

export const clerkBreadcrumbsDivider = 'text-mono-600';
