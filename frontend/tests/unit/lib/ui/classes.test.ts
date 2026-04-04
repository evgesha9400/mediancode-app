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
	dropdownPanel,
	marketingHeroCta,
	clerkCard,
	clerkUserButtonPopoverCard,
	clerkUserButtonPopoverMain,
	clerkUserButtonPopoverActions,
	clerkUserButtonPopoverFooter,
	modalFooterBtnPrimary,
	modalFooterBtnSecondary,
	modalInlineError,
	drawerFooterBtnDestructive,
	drawerFooterShellEdge,
	drawerFooterSegmentedPanel,
	drawerFooterSegmentDivider,
	drawerFooterSegmentBtn,
	drawerFooterBtnSecondarySegment,
	drawerFooterDeleteConfirmBanner,
	drawerFooterBtnDangerConfirmSegment,
	drawerFooterDangerCallout,
	drawerFooterBtnDangerConfirm,
	tableListBodyDivide,
	tableListCardShell,
	tableListCell,
	tableListPageGutter,
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

	it('dropdownPanel encodes floating list container', () => {
		expect(dropdownPanel).toContain('absolute');
		expect(dropdownPanel).toContain('rounded-xl');
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
		expect(clerkUserButtonPopoverCard).toContain('rounded-3xl');
		expect(clerkUserButtonPopoverCard).toContain('backdrop-blur-2xl');
		expect(clerkUserButtonPopoverCard).toContain('border-white/10');
		expect(clerkUserButtonPopoverCard).toContain('shadow-drawer-deep');
	});

	it('clerk UserButton popover inner slots stay transparent over glass', () => {
		expect(clerkUserButtonPopoverMain).toContain('bg-transparent');
		expect(clerkUserButtonPopoverActions).toContain('bg-transparent');
		expect(clerkUserButtonPopoverFooter).toContain('bg-mono-950/25');
		expect(clerkUserButtonPopoverFooter).toContain('border-t');
	});

	it('modal footer buttons use rounded-xl', () => {
		expect(modalFooterBtnSecondary).toContain('rounded-xl');
		expect(modalFooterBtnPrimary).toContain('rounded-xl');
		expect(modalInlineError).toContain('rounded-xl');
	});

	it('drawer destructive footer controls match chrome tokens', () => {
		expect(drawerFooterBtnDestructive).toContain('text-red-400');
		expect(drawerFooterDangerCallout).toContain('rounded-xl');
		expect(drawerFooterBtnDangerConfirm).toContain('rounded-xl');
	});

	it('drawer delete confirm banner aligns with segmented footer chrome', () => {
		expect(drawerFooterDeleteConfirmBanner).toContain('border-b');
		expect(drawerFooterDeleteConfirmBanner).toContain('text-red-400');
		expect(drawerFooterBtnDangerConfirmSegment).toContain('bg-red-600');
	});

	it('drawer segmented footer panel stacks on mobile and rows on sm+', () => {
		expect(drawerFooterShellEdge).toContain('px-0');
		expect(drawerFooterSegmentedPanel).toContain('flex-col');
		expect(drawerFooterSegmentedPanel).toContain('sm:flex-row');
		expect(drawerFooterSegmentedPanel).not.toContain('rounded-xl');
		expect(drawerFooterSegmentDivider).toContain('h-px');
		expect(drawerFooterSegmentDivider).toContain('sm:w-px');
		expect(drawerFooterSegmentBtn).toContain('sm:flex-1');
		expect(drawerFooterBtnSecondarySegment).not.toContain('border');
	});

	it('table list primitives align with dashboard chrome', () => {
		expect(tableListPageGutter).toContain('px-4');
		expect(tableListPageGutter).toContain('pb-4');
		expect(tableListCardShell).toContain('rounded-2xl');
		expect(tableListCardShell).toContain('border-mono-800/80');
		expect(tableListBodyDivide).toContain('divide-y');
		expect(tableListBodyDivide).toContain('divide-mono-800/30');
		expect(tableListCell).toContain('px-4');
		expect(tableListCell).toContain('py-4');
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
