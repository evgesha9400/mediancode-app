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
} from '$lib/ui/classes';

describe('lib/ui/classes', () => {
	it('inputGlass encodes solid input surface for overlay forms', () => {
		expect(inputGlass).toContain('rounded-xl');
		expect(inputGlass).toContain('border-mono-700/80');
		expect(inputGlass).toContain('focus:ring-green-400');
		expect(inputGlass).toContain('w-full');
		expect(inputGlass).toContain('bg-mono-900/80');
		expect(inputGlass).toContain('text-mono-100');
		expect(inputGlass).not.toContain('text-white');
	});

	it('inputGlassAuto matches glass surface without full width', () => {
		expect(inputGlassAuto).toContain('rounded-xl');
		expect(inputGlassAuto).toContain('border-mono-700/80');
		expect(inputGlassAuto).not.toContain('w-full');
	});

	it('inputGlassDisabled matches solid shell and muted readonly treatment', () => {
		expect(inputGlassDisabled).toContain('rounded-xl');
		expect(inputGlassDisabled).toContain('bg-mono-900/70');
		expect(inputGlassDisabled).toContain('text-mono-400');
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
			expect(c).toContain('bg-mono-950');
			expect(c).toContain('linear-gradient(to_top');
			expect(c).toContain('linear-gradient(to_right');
			expect(c).toContain('radial-gradient');
			expect(c).toContain('at_100%_0%');
		}
	});

	it('dropdownPanel encodes solid floating list (nested in frosted drawers)', () => {
		expect(dropdownPanel).toContain('absolute');
		expect(dropdownPanel).toContain('rounded-xl');
		expect(dropdownPanel).toContain('bg-mono-950');
	});

	it('dashboard card glass hooks app.css tokens and aliases', () => {
		expect(dashboardCardGlass).toBe('dashboard-card-glass');
		expect(cardGlassSurface).toBe(dashboardCardGlass);
		expect(cardGlassBorderDefault).toBe('');
		expect(cardOnboardingShell).toContain('dashboard-card-glass');
		expect(cardOnboardingShell).toContain('p-6');
	});

	it('popoverGlassMenuChrome reuses drawer panel glass', () => {
		expect(popoverGlassMenuChrome).toContain(drawerPanelGlassSurface);
		expect(popoverGlassMenuChrome).toContain('z-[100]');
		expect(popoverGlassMenuChrome).toContain('overflow-hidden');
	});

	it('marketingHeroCta encodes primary landing CTA', () => {
		expect(marketingHeroCta).toContain('bg-green-400');
		expect(marketingHeroCta).toContain('rounded-xl');
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
		expect(clerkUserButtonPopoverFooter).toContain('bg-mono-950/25');
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
		expect(drawerFooterBtnSecondarySegment).toContain('hover:text-mono-100');
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

	it('dashboard titles use text-mono-100 like sidebar brand, not text-white', () => {
		expect(dashboardPageTitleText).toContain('text-mono-100');
		expect(dashboardPageTitleText).toContain('shrink');
		expect(dashboardPageTitleText).not.toContain('text-white');
		expect(dashboardPageTitleTextDetail).toContain('text-mono-100');
		expect(dashboardPageTitleTextDetail).toContain('shrink-0');
		expect(drawerHeaderTitleText).toContain('text-mono-100');
		expect(drawerHeaderTitleText).toContain('text-xl');
	});

	it('dashboard semantic text tokens and back nav shell stay on mono-100 chroma', () => {
		expect(dashboardTextPrimary).toBe('text-mono-100');
		expect(dashboardControlTextMutedHoverPrimary).toContain('text-mono-300');
		expect(dashboardControlTextMutedHoverPrimary).toContain('hover:text-mono-100');
		expect(dashboardControlTextMutedHoverPrimary).toContain('transition-colors');
		expect(backNavButton).toContain('w-8');
		expect(backNavButton).toContain('h-8');
		expect(backNavButton).toContain('hover:text-mono-100');
		expect(clerkNavbarButton).toContain('data-[active=true]:text-mono-100');
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
		expect(tableListBodyDivide).toContain('divide-mono-800/30');
		expect(tableListThead).toContain('sticky');
		expect(tableListThead).toContain('bg-transparent');
		expect(tableListThead).not.toContain('bg-mono-800');
		expect(tableListThead).not.toContain('backdrop-blur');
		expect(tableListThead).toContain('border-mono-800/30');
		expect(tableListCell).toContain('px-4');
		expect(tableListCell).toContain('py-4');
		expect(tableListHeaderSortable).toContain('text-mono-100');
		expect(tableListHeaderSortable).toContain('uppercase');
		expect(tableListBodyPrimary).toContain('text-mono-100');
		expect(tableListBodyPrimary).toContain('font-medium');
		expect(tableListBodyCell).toContain('text-mono-100');
		expect(tableListBodyCell).not.toContain('font-medium');
		expect(tableListBodyCaption).toContain('text-mono-400');
		expect(tableListCellPrimary).toContain('px-4');
		expect(tableListCellPrimary).toContain('whitespace-nowrap');
		expect(tableListCellPrimary).toContain('text-mono-100');
		expect(tableListBodyLink).toContain('underline');
		expect(tableListBodyLink).toContain('hover:text-mono-300');
		expect(tableListAuxiliaryLabel).toContain('text-mono-300');
		expect(tableListAuxiliaryLabel).toContain('font-medium');
		expect(tableListDetailTitle).toBe(tableListBodyPrimary);
		expect(tableListPanelSectionTitle).toContain('mb-2');
		expect(tableListPanelStatLabel).toContain('text-mono-300');
		expect(tableListPanelStatTotal).toContain('font-bold');
	});

	it('query param pagination cells use glass row styling', () => {
		expect(queryParamReadonlyCell).toContain('rounded-xl');
		expect(queryParamReadonlyCell).toContain('border-mono-700/80');
		expect(queryParamPaginationToggleBase).toContain('rounded-xl');
	});

	it('search bar and API generator rows reuse solid control tokens', () => {
		expect(searchBarInput).toContain('bg-mono-900/80');
		expect(searchBarInput).toContain('pl-10');
		expect(apiGeneratorRowInputMono).toContain('font-mono');
		expect(apiGeneratorRowInputMono).toContain('h-[34px]');
		expect(objectSelectorDisplayRow).toContain('shadow-inner');
	});

	it('segmented pills and modal controls are centralized', () => {
		expect(segmentPillBase).toContain('first:rounded-l-xl');
		expect(modalFormCheckbox).toContain('border-mono-600');
		expect(drawerLinkedEntityRow).toContain('hover:bg-mono-700');
	});

	it('inlineRemoveIconButton encodes row icon remove treatment', () => {
		expect(inlineRemoveIconButton).toContain('text-red-400');
		expect(inlineRemoveIconButton).toContain('hover:text-red-300');
		expect(inlineRemoveIconButton).toContain('p-1');
	});
});
