/**
 * UI classes primitives tests
 *
 * Location mirrors: src/lib/ui/classes.ts
 */

import { describe, it, expect } from 'vitest';
import {
	inputGlass,
	inputGlassAuto,
	inputGlassDisabled,
	dashboardMainColumn,
	dashboardMainColumnCanvasForPath,
	dashboardControlTextMutedHoverPrimary,
	dashboardPageTitleText,
	dashboardPageTitleTextDetail,
	dashboardTextPrimary,
	drawerHeaderTitleText,
	backNavButton,
	clerkNavbarButton,
	dashboardCardGlass,
	dropdownPanel,
	dropdownPanelSolidSurface,
	drawerPanelGlassSurface,
	marketingHeroCta,
	clerkCard,
	clerkUserButtonPopoverCard,
	clerkUserButtonPopoverMain,
	clerkUserButtonPopoverActions,
	clerkUserButtonPopoverFooter,
	clerkModalBackdrop,
	modalDialogBackdropClass,
	modalPanelTransparentInner,
	popoverGlassMenuChrome,
	cardGlassBorderDefault,
	cardGlassSurface,
	cardOnboardingShell,
	modalFooterBtnPrimary,
	modalFooterBtnSecondary,
	modalInlineError,
	drawerBodyScrollArea,
	drawerFooterBtnDestructive,
	drawerFooterBtnDuplicateSegment,
	drawerFooterBtnPrimaryEnabled,
	drawerFooterBtnUndoSegment,
	drawerFooterShellEdge,
	drawerFooterSegmentedPanel,
	drawerFooterSegmentDivider,
	drawerFooterSegmentBtn,
	drawerFooterBtnSecondarySegment,
	drawerFooterDeleteConfirmBanner,
	drawerFooterBtnDangerConfirmSegment,
	drawerFooterDangerCallout,
	drawerFooterBtnDangerConfirm,
	drawerPanelFlexibleInner,
	drawerPanelStackedInner,
	drawerStackRoot,
	drawerStackDimmer,
	sidebarShell,
	sidebarShellMotionLocked,
	tableListAuxiliaryLabel,
	tableListBodyCaption,
	tableListBodyCell,
	tableListBodyDivide,
	tableListBodyLink,
	tableListBodyPrimary,
	tableListCardShell,
	tableListCell,
	tableListCellPrimary,
	tableListDetailTitle,
	tableListHeaderSortable,
	tableListPageGutter,
	tableListPanelSectionTitle,
	tableListPanelStatLabel,
	tableListPanelStatTotal,
	tableListThead,
	queryParamReadonlyCell,
	queryParamPaginationToggleBase,
	searchBarInput,
	apiGeneratorRowInputMono,
	objectSelectorDisplayRow,
	segmentPillBase,
	modalFormCheckbox,
	drawerLinkedEntityRow,
	inlineRemoveIconButton,
	dashboardPageHeaderPrimaryButton,
	apiReadinessStatusReadyClasses,
	themeAccentBadge,
	themeAccentCheckbox,
	themeAccentStatusBadge,
	themeAccentText,
} from '$lib/ui/classes';

describe('lib/ui/classes', () => {
	it('inputGlass encodes solid input surface for overlay forms', () => {
		expect(inputGlass).toContain('rounded-xl');
		expect(inputGlass).toContain('border-edge/80');
		expect(inputGlass).toContain('focus:ring-accent');
		expect(inputGlass).toContain('w-full');
		expect(inputGlass).toContain('bg-surface/80');
		expect(inputGlass).toContain('text-fg');
		expect(inputGlass).not.toContain('text-white');
	});

	it('inputGlassAuto matches glass surface without full width', () => {
		expect(inputGlassAuto).toContain('rounded-xl');
		expect(inputGlassAuto).toContain('border-edge/80');
		expect(inputGlassAuto).not.toContain('w-full');
	});

	it('inputGlassDisabled matches solid shell and muted readonly treatment', () => {
		expect(inputGlassDisabled).toContain('rounded-xl');
		expect(inputGlassDisabled).toContain('bg-surface/70');
		expect(inputGlassDisabled).toContain('text-fg-muted');
		expect(inputGlassDisabled).toContain('cursor-not-allowed');
	});

	it('dashboardMainColumn encodes flex column shell', () => {
		expect(dashboardMainColumn).toContain('flex-col');
		expect(dashboardMainColumn).toContain('min-h-0');
	});

	it('dashboardMainColumnCanvasForPath combines vertical wash, horizontal wash, and top-right radial', () => {
		for (const path of [
			'/types',
			'/dashboard',
			'/fields',
			'/objects',
			'/namespaces',
			'/apis',
			'/apis/uuid-here',
			'/settings',
			'/settings/organization',
		]) {
			const c = dashboardMainColumnCanvasForPath(path);
			expect(c).toContain('bg-surface-base');
			expect(c).toContain('linear-gradient(to_top');
			expect(c).toContain('linear-gradient(to_right');
			expect(c).toContain('radial-gradient');
			expect(c).toContain('at_100%_0%');
		}
	});

	it('dropdownPanel encodes opaque floating list and hooks dropdown-panel-solid-surface', () => {
		expect(dropdownPanel).toContain('absolute');
		expect(dropdownPanel).toContain('dropdown-panel-solid-surface');
		expect(dropdownPanel).toContain('max-h-60');
	});

	it('dashboard card glass hooks app.css tokens and aliases', () => {
		expect(dashboardCardGlass).toBe('dashboard-card-glass');
		expect(cardGlassSurface).toBe(dashboardCardGlass);
		expect(cardGlassBorderDefault).toBe('');
		expect(cardOnboardingShell).toContain('dashboard-card-glass');
		expect(cardOnboardingShell).toContain('p-6');
	});

	it('popoverGlassMenuChrome uses opaque dropdown shell', () => {
		expect(popoverGlassMenuChrome).toContain(dropdownPanelSolidSurface);
		expect(popoverGlassMenuChrome).toContain('z-[100]');
		expect(popoverGlassMenuChrome).toContain('overflow-hidden');
	});

	it('marketingHeroCta encodes primary landing CTA', () => {
		expect(marketingHeroCta).toContain('bg-accent');
		expect(marketingHeroCta).toContain('rounded-xl');
	});

	it('dashboardPageHeaderPrimaryButton uses soft-theme accent utilities', () => {
		expect(dashboardPageHeaderPrimaryButton).toContain('bg-accent');
		expect(dashboardPageHeaderPrimaryButton).toContain('hover:bg-accent-hover');
	});

	it('apiReadinessStatusReadyClasses matches ready chip accent', () => {
		expect(apiReadinessStatusReadyClasses).toContain('text-accent');
		expect(apiReadinessStatusReadyClasses).toContain('bg-accent/10');
	});

	it('theme accent primitives centralize shared accent tokens', () => {
		expect(themeAccentText).toBe('text-accent');
		expect(themeAccentBadge).toContain('bg-accent/10');
		expect(themeAccentBadge).toContain('text-accent');
		expect(themeAccentStatusBadge).toContain('border-accent/20');
		expect(themeAccentCheckbox).toContain('focus:ring-accent');
	});

	it('clerkCard encodes Clerk modal surface', () => {
		expect(clerkCard).toContain('rounded-3xl');
		expect(clerkCard).toContain('backdrop-blur');
	});

	it('clerkUserButtonPopoverCard matches drawer glass', () => {
		expect(clerkUserButtonPopoverCard).toBe('drawer-panel-glass-surface');
	});

	it('clerk UserButton popover inner slots stay transparent over glass', () => {
		expect(clerkUserButtonPopoverMain).toContain('bg-transparent');
		expect(clerkUserButtonPopoverActions).toContain('bg-transparent');
		expect(clerkUserButtonPopoverFooter).toContain('bg-surface-base/25');
		expect(clerkUserButtonPopoverFooter).toContain('border-t');
	});

	it('modal and Clerk full-screen overlays use the same scrim layer as drawers', () => {
		expect(clerkModalBackdrop).toBe('drawer-scrim');
		expect(modalDialogBackdropClass).toBe('modal-dialog-scrim');
		expect(modalPanelTransparentInner).toContain('drawer-transparent-context');
		expect(modalPanelTransparentInner).toContain('rounded-[inherit]');
	});

	it('modal footer buttons use rounded-xl', () => {
		expect(modalFooterBtnSecondary).toContain('rounded-xl');
		expect(modalFooterBtnPrimary).toContain('rounded-xl');
		expect(modalInlineError).toContain('rounded-xl');
	});

	it('drawer destructive footer controls match chrome tokens', () => {
		expect(drawerFooterBtnDestructive).toContain('text-red-400');
		expect(drawerFooterBtnDestructive).toContain('hover:text-red-200');
		expect(drawerFooterDangerCallout).toContain('rounded-xl');
		expect(drawerFooterBtnDangerConfirm).toContain('rounded-xl');
	});

	it('drawerBodyScrollArea carries scroll hook for drawer hover scoping', () => {
		expect(drawerBodyScrollArea).toContain('drawer-body-scroll');
		expect(drawerBodyScrollArea).toContain('overflow-auto');
	});

	it('drawer undo and duplicate segments use amber and blue accents', () => {
		expect(drawerFooterBtnUndoSegment).toContain('text-amber-300');
		expect(drawerFooterBtnUndoSegment).toContain('hover:bg-amber-400/20');
		expect(drawerFooterBtnDuplicateSegment).toContain('text-blue-300');
		expect(drawerFooterBtnDuplicateSegment).toContain('hover:bg-blue-400/20');
	});

	it('drawer delete confirm banner aligns with segmented footer chrome', () => {
		expect(drawerFooterDeleteConfirmBanner).toContain('border-b');
		expect(drawerFooterDeleteConfirmBanner).toContain('text-red-400');
		expect(drawerFooterBtnDangerConfirmSegment).toContain('bg-red-600');
	});

	it('drawer segmented footer panel stacks on mobile and rows on sm+', () => {
		expect(drawerFooterShellEdge).toContain('drawer-footer-shell');
		expect(drawerFooterShellEdge).toContain('px-0');
		expect(drawerFooterSegmentedPanel).toContain('drawer-footer-segmented-panel');
		expect(drawerFooterSegmentedPanel).toContain('flex-col');
		expect(drawerFooterSegmentedPanel).toContain('sm:flex-row');
		expect(drawerFooterSegmentedPanel).not.toContain('rounded-xl');
		expect(drawerFooterSegmentDivider).toContain('h-px');
		expect(drawerFooterSegmentDivider).toContain('sm:w-px');
		expect(drawerFooterSegmentBtn).toContain('sm:flex-1');
		expect(drawerFooterBtnSecondarySegment).not.toContain('border');
		expect(drawerFooterBtnSecondarySegment).toContain('hover:text-fg');
		expect(drawerFooterBtnPrimaryEnabled).toContain('hover:shadow-md');
	});

	it('drawer inner clip inherits the outer panel radius', () => {
		expect(drawerPanelFlexibleInner).toContain('rounded-[inherit]');
		expect(drawerPanelStackedInner).toContain('rounded-[inherit]');
		expect(drawerPanelFlexibleInner).toContain('overflow-hidden');
	});

	it('nested drawer dimmer inherits the outer panel radius', () => {
		expect(drawerStackDimmer).toContain('rounded-[inherit]');
		expect(drawerStackDimmer).toContain('absolute');
		expect(drawerStackDimmer).toContain('inset-0');
	});

	it('drawer stack root carries the shared motion hook', () => {
		expect(drawerStackRoot).toContain('drawer-stack-root');
		expect(drawerStackRoot).toContain('fixed');
		expect(drawerStackRoot).toContain('pointer-events-none');
	});

	it('dashboard titles use text-fg like sidebar brand, not text-white', () => {
		expect(dashboardPageTitleText).toContain('text-fg');
		expect(dashboardPageTitleText).toContain('shrink');
		expect(dashboardPageTitleText).not.toContain('text-white');
		expect(dashboardPageTitleTextDetail).toContain('text-fg');
		expect(dashboardPageTitleTextDetail).toContain('shrink-0');
		expect(drawerHeaderTitleText).toContain('text-fg');
		expect(drawerHeaderTitleText).toContain('text-xl');
	});

	it('dashboard semantic text tokens and back nav shell stay on mono-100 chroma', () => {
		expect(dashboardTextPrimary).toBe('text-fg');
		expect(dashboardControlTextMutedHoverPrimary).toContain('text-fg-secondary');
		expect(dashboardControlTextMutedHoverPrimary).toContain('hover:text-fg');
		expect(dashboardControlTextMutedHoverPrimary).toContain('transition-colors');
		expect(backNavButton).toContain('w-8');
		expect(backNavButton).toContain('h-8');
		expect(backNavButton).toContain('hover:text-fg');
		expect(clerkNavbarButton).toContain('data-[active=true]:text-fg');
	});

	it('sidebar shell can drop width transitions during drawer motion', () => {
		expect(sidebarShell).toContain('transition-[width]');
		expect(sidebarShell).toContain('duration-[400ms]');
		expect(sidebarShellMotionLocked).not.toContain('transition-[width]');
		expect(sidebarShellMotionLocked).toContain('overflow-hidden');
	});

	it('table list primitives align with dashboard chrome', () => {
		expect(tableListPageGutter).toContain('px-4');
		expect(tableListPageGutter).toContain('pb-4');
		expect(tableListCardShell).toContain('w-full');
		expect(tableListCardShell).toContain('overflow-x-auto');
		expect(tableListCardShell).not.toContain('bg-mono');
		expect(tableListCardShell).not.toContain('backdrop-blur');
		expect(tableListCardShell).not.toContain('border');
		expect(tableListBodyDivide).toContain('divide-y');
		expect(tableListBodyDivide).toContain('divide-edge-faint/30');
		expect(tableListThead).toContain('sticky');
		expect(tableListThead).toContain('bg-transparent');
		expect(tableListThead).not.toContain('bg-surface-raised');
		expect(tableListThead).not.toContain('backdrop-blur');
		expect(tableListThead).toContain('border-edge-faint/30');
		expect(tableListCell).toContain('px-4');
		expect(tableListCell).toContain('py-4');
		expect(tableListHeaderSortable).toContain('text-fg');
		expect(tableListHeaderSortable).toContain('uppercase');
		expect(tableListBodyPrimary).toContain('text-fg');
		expect(tableListBodyPrimary).toContain('font-medium');
		expect(tableListBodyCell).toContain('text-fg');
		expect(tableListBodyCell).not.toContain('font-medium');
		expect(tableListBodyCaption).toContain('text-fg-muted');
		expect(tableListCellPrimary).toContain('px-4');
		expect(tableListCellPrimary).toContain('whitespace-nowrap');
		expect(tableListCellPrimary).toContain('text-fg');
		expect(tableListBodyLink).toContain('underline');
		expect(tableListBodyLink).toContain('hover:text-fg-secondary');
		expect(tableListAuxiliaryLabel).toContain('text-fg-secondary');
		expect(tableListAuxiliaryLabel).toContain('font-medium');
		expect(tableListDetailTitle).toBe(tableListBodyPrimary);
		expect(tableListPanelSectionTitle).toContain('mb-2');
		expect(tableListPanelStatLabel).toContain('text-fg-secondary');
		expect(tableListPanelStatTotal).toContain('font-bold');
	});

	it('query param pagination cells use glass row styling', () => {
		expect(queryParamReadonlyCell).toContain('rounded-xl');
		expect(queryParamReadonlyCell).toContain('border-edge/80');
		expect(queryParamPaginationToggleBase).toContain('rounded-xl');
	});

	it('search bar and API generator rows reuse solid control tokens', () => {
		expect(searchBarInput).toContain('bg-surface/80');
		expect(searchBarInput).toContain('pl-10');
		expect(apiGeneratorRowInputMono).toContain('font-mono');
		expect(apiGeneratorRowInputMono).toContain('h-[34px]');
		expect(objectSelectorDisplayRow).toContain('shadow-inner');
	});

	it('segmented pills and modal controls are centralized', () => {
		expect(segmentPillBase).toContain('first:rounded-l-xl');
		expect(modalFormCheckbox).toContain('border-edge-strong');
		expect(drawerLinkedEntityRow).toContain('hover:bg-surface-overlay');
	});

	it('inlineRemoveIconButton encodes row icon remove treatment', () => {
		expect(inlineRemoveIconButton).toContain('text-red-400');
		expect(inlineRemoveIconButton).toContain('hover:text-red-300');
		expect(inlineRemoveIconButton).toContain('p-1');
	});
});
