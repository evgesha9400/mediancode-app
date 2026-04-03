/**
 * UI class primitives for the soft / glass theme (`html[data-theme="soft"]` in app.css).
 *
 * Inventory — repeated Tailwind clusters and where they live:
 * | Cluster | tailwind.config | this module |
 * | Glass text input + green focus ring | — | `inputGlass`, `inputGlassSearch` |
 * | Autocomplete / dropdown panels | — | `dropdownPanel`, `dropdownPanelMessage` |
 * | Dashboard & stat cards | `boxShadow.glow-*` | `cardGlassSurface`, `cardGlassBorder*` |
 * | Green accent icon tiles | `glow-green-icon`, `glow-green-sm` | `accentIconTile`, `marketingFeatureIcon` |
 * | Sidebar shell & nav items | — | `sidebarShell`, `sidebarNavItem*` |
 * | Dashboard column shell & page header chrome | — | `dashboardMainColumn`, `dashboardPageHeaderShell`, `mainColumnChromePaddingX`, `dashboardPageHeaderTitleBand`, `dashboardPageHeaderGradient` |
 * | Drawer panels & scrim | `drawer-deep` | `drawerPanelFlexible`, `drawerPanelStacked`, … |
 * | Primary / secondary buttons | `glow-green` | `drawerFooterBtnPrimary*`, `btnCtaGlow`, … |
 * | Marketing landing | `glow-*` | `marketingCtaPrimary` (nav), `marketingHeroCta` + `marketingHeroCtaSecondary`, `marketingFooterCta` + `marketingFooterCtaSecondary` |
 * | Clerk `appearance.elements` | `glow-green` | `clerkCard`, `clerkFormButtonPrimary`, … |
 */

// --- Form inputs ---

/** Standard glass search/select text field (add `inputGlassSearchSuffix` when a search icon sits on the right). */
export const inputGlass =
  'w-full px-3 py-1.5 border border-mono-700/80 rounded-xl bg-mono-900/50 backdrop-blur-sm text-white focus:ring-2 focus:ring-green-400/50 outline-none focus:outline-none transition-all text-sm';

export const inputGlassSearchSuffix = 'pr-8';

export const inputGlassSearch = `${inputGlass} ${inputGlassSearchSuffix}`;

/** Compact row showing a selected entity (e.g. object picker). */
export const objectSelectorDisplayRow =
  'w-full px-3 border border-mono-700/80 rounded-xl bg-mono-900/50 backdrop-blur-sm shadow-inner flex items-center justify-between h-[34px]';

// --- Dropdowns / floating panels ---

export const dropdownPanel =
  'absolute z-30 w-full mt-1 bg-mono-900/95 backdrop-blur-sm border border-mono-700/80 rounded-xl shadow-lg shadow-black/30 max-h-60 overflow-hidden flex flex-col';

export const dropdownPanelMessage =
  'absolute z-30 w-full mt-1 bg-mono-900/95 backdrop-blur-sm border border-mono-700/80 rounded-xl shadow-lg shadow-black/30';

export const dropdownListScroll = 'min-h-0 overflow-y-auto';

export const dropdownRow =
  'w-full px-3 py-2 text-left hover:bg-mono-800 border-b border-mono-700 last:border-b-0 transition-colors';

export const listMetaBadge = 'text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded-lg';

export const dropdownCreateRow =
  'w-full text-left px-3 py-2 text-sm text-mono-400 hover:bg-mono-800 hover:text-mono-100 rounded-lg cursor-pointer flex items-center space-x-2';

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
  'bg-mono-950/40 backdrop-blur-md text-mono-300 font-inter border-r border-mono-800/60 flex flex-col shrink-0 transition-[width] duration-[400ms] overflow-hidden';

export const sidebarDividerToken = 'border-mono-800/60';

/** Bottom border under logo, user block, and horizontal rules in collapsed mode */
export const sidebarSectionBorderBottom = 'border-b border-mono-800/60';

export const sidebarSectionDividerHorizontal = 'border-t border-mono-800/60 my-2';

export const sidebarNavItemBase = 'cursor-pointer transition-all rounded-xl';

export const sidebarNavItemActive = 'bg-mono-800/80 text-white shadow-sm border border-mono-700/50';

export const sidebarNavItemInactive = 'hover:bg-mono-800/50 hover:text-white border border-transparent';

// --- Dashboard main column (sidebar right pane) ---

/** Fills the flex slot next to the sidebar; enables scroll inside the body. */
export const dashboardMainColumn = 'flex flex-col flex-1 min-h-0 w-full';

/** Shared glass header strip (PageHeader + custom detail headers). Matches sidebar brand row: `p-4` + 48px content band. */
export const dashboardPageHeaderShell =
  'bg-mono-950/40 backdrop-blur-md border-b border-mono-800/60 py-4 px-4 relative z-[60] w-full shrink-0';

/** Horizontal padding for search / toolbars under the page header (keep in sync with `dashboardPageHeaderShell`). */
export const mainColumnChromePaddingX = 'px-4';

/** Primary title line height band — matches `PreRenderedLogo` `md` (48px) with sidebar `items-center` row. */
export const dashboardPageHeaderTitleBand = 'min-h-[48px] flex items-center';

export const dashboardPageHeaderGradient =
  'absolute inset-0 bg-gradient-to-r from-green-400/5 to-transparent pointer-events-none w-full h-full';

// --- Drawer stack ---

export const drawerScrim = 'fixed top-0 right-0 h-screen z-[60] bg-black/40';

export const drawerPanelFlexible =
  'h-[calc(100vh-32px)] m-4 flex flex-col bg-mono-950/90 backdrop-blur-3xl overflow-hidden relative rounded-3xl shadow-drawer-deep border border-mono-800/80 pointer-events-auto';

export const drawerPanelStacked =
  'flex-shrink-0 h-[calc(100vh-32px)] my-4 mr-4 flex flex-col bg-mono-950/90 backdrop-blur-3xl overflow-hidden relative border border-mono-800/80 shadow-drawer-deep rounded-3xl pointer-events-auto';

export const drawerStackDimmer = 'absolute inset-0 bg-mono-900/50 backdrop-blur-sm/60 z-10';

// --- Drawer footer & primary actions ---

export const drawerFooterBtnBlock =
  'w-full px-4 py-2 rounded-xl text-sm border font-inter tracking-wide transition-colors';

export const drawerFooterBtnPrimaryEnabled =
  'bg-green-400 border-transparent text-mono-950 font-semibold shadow-sm hover:bg-green-300 cursor-pointer';

export const drawerFooterBtnPrimaryDisabled =
  'font-medium bg-mono-800 border-mono-800 text-mono-500 cursor-not-allowed';

export const drawerFooterBtnSecondary =
  'border border-mono-600 text-mono-300 transition-colors font-medium font-inter tracking-wide hover:bg-mono-800 cursor-pointer';

export const drawerFooterBtnSecondaryMuted =
  'border border-mono-700 text-mono-400 cursor-not-allowed bg-mono-800';

export const btnCtaGlow =
  'px-5 py-2.5 bg-green-400 text-mono-950 font-inter font-semibold rounded-xl text-sm hover:bg-green-300 transition-all shadow-glow-green cursor-pointer';

export const btnGenerateSm =
  'text-xs px-4 py-1.5 rounded-lg bg-green-400 text-mono-950 font-inter font-bold hover:bg-green-300 transition-colors cursor-pointer flex items-center space-x-1 shadow-glow-green-sm';

export const btnEmptyStatePrimary =
  'mt-5 px-6 py-2.5 bg-green-400 text-mono-950 font-inter font-bold rounded-2xl tracking-wide shadow-glow-green hover:bg-green-300 transition-all cursor-pointer';

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
