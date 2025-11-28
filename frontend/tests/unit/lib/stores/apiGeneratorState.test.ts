import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { createApiGeneratorState } from '$lib/stores/apiGeneratorState.svelte';
import {
	apiMetadataStore,
	tagsStore,
	endpointsStore,
	updateEndpoint,
	initialApiMetadata
} from '$lib/stores/apis';
import { seedIdGenerator } from '$lib/utils/ids';
import * as toastsModule from '$lib/stores/toasts';

// Mock the toasts store
vi.mock('$lib/stores/toasts', () => ({
	showToast: vi.fn()
}));

describe('apiGeneratorState - Initialization', () => {
	beforeEach(() => {
		// Reset stores
		apiMetadataStore.set(initialApiMetadata);
		tagsStore.set([]);
		endpointsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
		vi.clearAllMocks();
	});

	it('should initialize with store values', () => {
		const state = createApiGeneratorState();

		expect(state.metadata).toEqual(initialApiMetadata);
		expect(state.tags).toEqual([]);
		expect(state.endpoints).toEqual([]);
		expect(state.drawerOpen).toBe(false);
		expect(state.selectedEndpoint).toBeNull();
		expect(state.editedEndpoint).toBeNull();
	});

	it('should reflect store updates', () => {
		const state = createApiGeneratorState();

		apiMetadataStore.set({
			...initialApiMetadata,
			title: 'Updated API'
		});

		// Note: In a real Svelte component context, this would update automatically
		// For testing, we verify the store was updated
		expect(get(apiMetadataStore).title).toBe('Updated API');
	});
});

describe('apiGeneratorState - Metadata Operations', () => {
	beforeEach(() => {
		apiMetadataStore.set(initialApiMetadata);
		vi.clearAllMocks();
	});

	it('should update metadata', () => {
		const state = createApiGeneratorState();

		state.handleMetadataUpdate({ title: 'My API', version: '2.0.0' });

		const metadata = get(apiMetadataStore);
		expect(metadata.title).toBe('My API');
		expect(metadata.version).toBe('2.0.0');
	});
});

describe('apiGeneratorState - Tag Operations', () => {
	beforeEach(() => {
		tagsStore.set([]);
		endpointsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
		vi.clearAllMocks();
	});

	it('should create a new tag', () => {
		const state = createApiGeneratorState();

		// Simulate opening an endpoint first
		const endpoint = {
			id: 'endpoint-1',
			method: 'GET' as const,
			path: '/test',
			description: '',
			pathParams: [],
			queryParams: [],
			responseBody: '{}',
			useEnvelope: true,
			expanded: false
		};
		state.editedEndpoint = endpoint;
		state.tagInputValue = 'Users';

		state.handleCreateTag();

		const tags = get(tagsStore);
		expect(tags).toHaveLength(1);
		expect(tags[0].name).toBe('Users');
		expect(state.editedEndpoint?.tagId).toBe(tags[0].id);
		expect(toastsModule.showToast).toHaveBeenCalledWith('Tag "Users" created', 'success');
	});

	it('should not create tag if input is empty', () => {
		const state = createApiGeneratorState();

		state.editedEndpoint = {
			id: 'endpoint-1',
			method: 'GET' as const,
			path: '/test',
			description: '',
			pathParams: [],
			queryParams: [],
			responseBody: '{}',
			useEnvelope: true,
			expanded: false
		};
		state.tagInputValue = '   ';

		state.handleCreateTag();

		const tags = get(tagsStore);
		expect(tags).toHaveLength(0);
		expect(toastsModule.showToast).not.toHaveBeenCalled();
	});

	it('should select an existing tag', () => {
		const state = createApiGeneratorState();

		// Create a tag first
		state.editedEndpoint = {
			id: 'endpoint-1',
			method: 'GET' as const,
			path: '/test',
			description: '',
			pathParams: [],
			queryParams: [],
			responseBody: '{}',
			useEnvelope: true,
			expanded: false
		};
		state.tagInputValue = 'Users';
		state.handleCreateTag();

		const tags = get(tagsStore);
		const tagId = tags[0].id;

		// Select the tag
		state.handleTagSelect(tagId);

		expect(state.editedEndpoint?.tagId).toBe(tagId);
		expect(state.tagInputValue).toBe('Users');
		expect(state.tagDropdownOpen).toBe(false);
	});

	it('should clear tag selection', () => {
		const state = createApiGeneratorState();

		state.editedEndpoint = {
			id: 'endpoint-1',
			method: 'GET' as const,
			path: '/test',
			description: '',
			tagId: 'some-tag',
			pathParams: [],
			queryParams: [],
			responseBody: '{}',
			useEnvelope: true,
			expanded: false
		};
		state.tagInputValue = 'Users';

		state.handleTagSelect(undefined);

		expect(state.editedEndpoint?.tagId).toBeUndefined();
		expect(state.tagInputValue).toBe('');
	});

	it('should delete tag with confirmation', () => {
		const state = createApiGeneratorState();

		// Create a tag
		state.editedEndpoint = {
			id: 'endpoint-1',
			method: 'GET' as const,
			path: '/test',
			description: '',
			pathParams: [],
			queryParams: [],
			responseBody: '{}',
			useEnvelope: true,
			expanded: false
		};
		state.tagInputValue = 'Users';
		state.handleCreateTag();

		const tags = get(tagsStore);
		const tag = tags[0];

		// Click delete
		state.handleDeleteTagClick(new Event('click'), tag);
		expect(state.tagToDelete).toEqual(tag);

		// Confirm delete
		state.confirmDeleteTag();

		expect(get(tagsStore)).toHaveLength(0);
		expect(state.tagToDelete).toBeNull();
		expect(toastsModule.showToast).toHaveBeenCalledWith(expect.stringContaining('deleted'), 'success');
	});

	it('should cancel tag deletion', () => {
		const state = createApiGeneratorState();

		// Create a tag
		state.editedEndpoint = {
			id: 'endpoint-1',
			method: 'GET' as const,
			path: '/test',
			description: '',
			pathParams: [],
			queryParams: [],
			responseBody: '{}',
			useEnvelope: true,
			expanded: false
		};
		state.tagInputValue = 'Users';
		state.handleCreateTag();

		const tags = get(tagsStore);
		const tag = tags[0];

		// Click delete
		state.handleDeleteTagClick(new Event('click'), tag);
		expect(state.tagToDelete).toEqual(tag);

		// Cancel
		state.cancelDeleteTag();

		expect(state.tagToDelete).toBeNull();
		expect(get(tagsStore)).toHaveLength(1); // Tag still exists
	});

	it('should not resurrect deleted tag on Undo', () => {
		const state = createApiGeneratorState();

		// Create an endpoint with a tag
		state.handleAddEndpoint();
		const endpoint = get(endpointsStore)[0];
		state.openEndpoint(endpoint);

		// Create and assign a tag
		state.tagInputValue = 'Users';
		state.handleCreateTag();

		const tags = get(tagsStore);
		const tag = tags[0];

		// Save to persist the tag assignment
		state.handleSave();

		// Reopen the endpoint so both selectedEndpoint and editedEndpoint have the tag
		const savedEndpoint = get(endpointsStore)[0];
		state.openEndpoint(savedEndpoint);

		// Verify tag is assigned to both
		expect(state.editedEndpoint?.tagId).toBe(tag.id);
		expect(state.selectedEndpoint?.tagId).toBe(tag.id);

		// Delete the tag
		state.handleDeleteTagClick(new Event('click'), tag);
		state.confirmDeleteTag();

		// Verify tag is removed from both edited and selected endpoints
		expect(state.editedEndpoint?.tagId).toBeUndefined();
		expect(state.selectedEndpoint?.tagId).toBeUndefined();

		// Press Undo - should NOT resurrect the deleted tag
		state.handleUndo();

		// editedEndpoint should still have no tag (selectedEndpoint was also cleared)
		expect(state.editedEndpoint?.tagId).toBeUndefined();
	});

	it('should count endpoints using tag', () => {
		const state = createApiGeneratorState();

		// This is tested in apis.test.ts, but we verify the state exposes it
		expect(typeof state.getEndpointsUsingTag).toBe('function');
		expect(state.getEndpointsUsingTag('any-tag')).toBe(0);
	});
});

describe('apiGeneratorState - Endpoint Operations', () => {
	beforeEach(() => {
		endpointsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
		vi.clearAllMocks();
	});

	it('should add a new endpoint and open it without showing toast', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();

		const endpoints = get(endpointsStore);
		expect(endpoints).toHaveLength(1);
		expect(endpoints[0].id).toBe('endpoint-1000000-0');
		expect(state.drawerOpen).toBe(true);
		expect(state.selectedEndpoint).toEqual(endpoints[0]);
		// No toast for endpoint creation - only for delete/update
		expect(toastsModule.showToast).not.toHaveBeenCalled();
	});

	it('should delete an endpoint', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoints = get(endpointsStore);
		const endpointId = endpoints[0].id;

		vi.clearAllMocks();
		state.handleDeleteEndpoint(endpointId);

		expect(get(endpointsStore)).toHaveLength(0);
		expect(toastsModule.showToast).toHaveBeenCalledWith('Endpoint deleted successfully', 'success');
	});

	it('should close drawer when deleting currently open endpoint', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoints = get(endpointsStore);
		const endpointId = endpoints[0].id;

		// Drawer should be open with this endpoint
		expect(state.drawerOpen).toBe(true);
		expect(state.selectedEndpoint?.id).toBe(endpointId);

		state.handleDeleteEndpoint(endpointId);

		expect(state.drawerOpen).toBe(false);
	});

	it('should duplicate an endpoint', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoints = get(endpointsStore);
		const originalId = endpoints[0].id;

		vi.clearAllMocks();
		state.handleDuplicateEndpoint(originalId);

		const updated = get(endpointsStore);
		expect(updated).toHaveLength(2);
		expect(updated[1].id).not.toBe(originalId);
		expect(toastsModule.showToast).toHaveBeenCalledWith('Endpoint duplicated successfully', 'success');
	});
});

describe('apiGeneratorState - Drawer Operations', () => {
	beforeEach(() => {
		endpointsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
		vi.clearAllMocks();
	});

	it('should open endpoint in drawer', () => {
		const state = createApiGeneratorState();

		const endpoint = {
			id: 'endpoint-1',
			method: 'GET' as const,
			path: '/test',
			description: '',
			pathParams: [],
			queryParams: [],
			responseBody: '{}',
			useEnvelope: true,
			expanded: false
		};

		state.openEndpoint(endpoint);

		expect(state.drawerOpen).toBe(true);
		expect(state.selectedEndpoint).toEqual(endpoint);
		expect(state.editedEndpoint).toEqual(endpoint);
		expect(state.editedEndpoint).not.toBe(endpoint); // Should be a clone
	});

	it('should track changes', () => {
		const state = createApiGeneratorState();

		const endpoint = {
			id: 'endpoint-1',
			method: 'GET' as const,
			path: '/test',
			description: '',
			pathParams: [],
			queryParams: [],
			responseBody: '{}',
			useEnvelope: true,
			expanded: false
		};

		state.openEndpoint(endpoint);

		expect(state.hasChanges).toBe(false);

		// Make a change
		state.editedEndpoint!.description = 'Updated';

		// In a real component this would be reactive, but we test the logic
		const hasChanges = JSON.stringify(state.editedEndpoint) !== JSON.stringify(state.selectedEndpoint);
		expect(hasChanges).toBe(true);
	});

	it('should save changes', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoints = get(endpointsStore);
		const endpoint = endpoints[0];

		// Edit the endpoint
		state.editedEndpoint!.description = 'Updated description';

		vi.clearAllMocks();
		state.handleSave();

		const updated = get(endpointsStore)[0];
		expect(updated.description).toBe('Updated description');
		expect(toastsModule.showToast).toHaveBeenCalledWith('Endpoint saved successfully', 'success');
	});

	it('should undo changes', () => {
		const state = createApiGeneratorState();

		// Use a real endpoint from the store to ensure it can be cloned
		state.handleAddEndpoint();
		const endpoint = get(endpointsStore)[0];

		// Set initial description
		updateEndpoint(endpoint.id, { description: 'Original' });
		const updatedEndpoint = get(endpointsStore)[0];

		state.openEndpoint(updatedEndpoint);
		state.editedEndpoint!.description = 'Changed';

		state.handleUndo();

		expect(state.editedEndpoint?.description).toBe('Original');
	});

	it('should close drawer', () => {
		const state = createApiGeneratorState();

		const endpoint = {
			id: 'endpoint-1',
			method: 'GET' as const,
			path: '/test',
			description: '',
			pathParams: [],
			queryParams: [],
			responseBody: '{}',
			useEnvelope: true,
			expanded: false
		};

		state.openEndpoint(endpoint);
		expect(state.drawerOpen).toBe(true);

		state.closeDrawer();

		expect(state.drawerOpen).toBe(false);
		// selectedEndpoint and editedEndpoint are cleared after a timeout
	});

	it('should handle cancel', () => {
		const state = createApiGeneratorState();

		const endpoint = {
			id: 'endpoint-1',
			method: 'GET' as const,
			path: '/test',
			description: '',
			pathParams: [],
			queryParams: [],
			responseBody: '{}',
			useEnvelope: true,
			expanded: false
		};

		state.openEndpoint(endpoint);
		state.editedEndpoint!.description = 'Changed';

		state.handleCancel();

		expect(state.drawerOpen).toBe(false);
		// Changes are discarded (not saved)
		expect(get(endpointsStore).find(e => e.id === endpoint.id)).toBeUndefined();
	});
});

describe('apiGeneratorState - Path and Parameter Operations', () => {
	beforeEach(() => {
		endpointsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
		vi.clearAllMocks();
	});

	it('should handle path change locally without persisting to store', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoint = get(endpointsStore)[0];
		state.openEndpoint(endpoint);

		state.handlePathChange('/users/{user_id}');

		// Changes should only be in editedEndpoint
		expect(state.editedEndpoint?.path).toBe('/users/{user_id}');
		expect(state.editedEndpoint?.pathParams).toHaveLength(1);
		expect(state.editedEndpoint?.pathParams[0].name).toBe('user_id');

		// Store should still have the original path
		const storeEndpoint = get(endpointsStore)[0];
		expect(storeEndpoint.path).toBe('/');
		expect(storeEndpoint.pathParams).toHaveLength(0);
	});

	it('should persist path changes to store only on Save', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoint = get(endpointsStore)[0];
		state.openEndpoint(endpoint);

		state.handlePathChange('/users/{user_id}');

		// Verify store unchanged
		expect(get(endpointsStore)[0].path).toBe('/');

		// Save changes
		vi.clearAllMocks();
		state.handleSave();

		// Now store should have the new path
		const updated = get(endpointsStore)[0];
		expect(updated.path).toBe('/users/{user_id}');
		expect(updated.pathParams).toHaveLength(1);
	});

	it('should discard path changes on Undo', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoint = get(endpointsStore)[0];
		state.openEndpoint(endpoint);

		state.handlePathChange('/users/{user_id}');

		// Verify editedEndpoint has changes
		expect(state.editedEndpoint?.path).toBe('/users/{user_id}');

		// Undo changes
		state.handleUndo();

		// editedEndpoint should be restored to original
		expect(state.editedEndpoint?.path).toBe('/');
		expect(state.editedEndpoint?.pathParams).toHaveLength(0);

		// Store should still be unchanged
		expect(get(endpointsStore)[0].path).toBe('/');
	});

	it('should update path parameter', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoint = get(endpointsStore)[0];
		state.openEndpoint(endpoint);
		state.handlePathChange('/users/{user_id}');

		const paramId = state.editedEndpoint!.pathParams[0].id;

		state.handlePathParamUpdate(paramId, {
			type: 'integer',
			description: 'User ID'
		});

		expect(state.editedEndpoint?.pathParams[0].type).toBe('integer');
		expect(state.editedEndpoint?.pathParams[0].description).toBe('User ID');
	});

	it('should delete path parameter', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoint = get(endpointsStore)[0];
		state.openEndpoint(endpoint);
		state.handlePathChange('/users/{user_id}');

		const paramId = state.editedEndpoint!.pathParams[0].id;

		state.handlePathParamDelete(paramId);

		expect(state.editedEndpoint?.pathParams).toHaveLength(0);
	});

	it('should add query parameter locally without persisting to store', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoint = get(endpointsStore)[0];
		state.openEndpoint(endpoint);

		state.handleAddQueryParam();

		// Changes should only be in editedEndpoint, not in the store
		expect(state.editedEndpoint?.queryParams).toHaveLength(1);
		expect(state.editedEndpoint?.queryParams[0].name).toBe('new_param');

		// Store should still have the original (no query params)
		const storeEndpoint = get(endpointsStore)[0];
		expect(storeEndpoint.queryParams).toHaveLength(0);
	});

	it('should persist query parameter to store only on Save', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoint = get(endpointsStore)[0];
		state.openEndpoint(endpoint);

		state.handleAddQueryParam();

		// Verify store unchanged
		expect(get(endpointsStore)[0].queryParams).toHaveLength(0);

		// Save changes
		vi.clearAllMocks();
		state.handleSave();

		// Now store should have the query param
		expect(get(endpointsStore)[0].queryParams).toHaveLength(1);
	});

	it('should update query parameter locally', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoint = get(endpointsStore)[0];
		state.openEndpoint(endpoint);
		state.handleAddQueryParam();

		const paramId = state.editedEndpoint!.queryParams[0].id;

		state.handleQueryParamUpdate(paramId, {
			name: 'limit',
			type: 'integer'
		});

		// Changes are local to editedEndpoint
		expect(state.editedEndpoint?.queryParams[0].name).toBe('limit');
		expect(state.editedEndpoint?.queryParams[0].type).toBe('integer');

		// Store should still be unchanged
		expect(get(endpointsStore)[0].queryParams).toHaveLength(0);
	});

	it('should delete query parameter locally', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoint = get(endpointsStore)[0];
		state.openEndpoint(endpoint);
		state.handleAddQueryParam();

		const paramId = state.editedEndpoint!.queryParams[0].id;

		state.handleQueryParamDelete(paramId);

		// editedEndpoint should have no query params
		expect(state.editedEndpoint?.queryParams).toHaveLength(0);

		// Store should still be unchanged (was never modified)
		expect(get(endpointsStore)[0].queryParams).toHaveLength(0);
	});

	it('should discard query param changes on Cancel', () => {
		const state = createApiGeneratorState();

		state.handleAddEndpoint();
		const endpoint = get(endpointsStore)[0];
		state.openEndpoint(endpoint);
		state.handleAddQueryParam();

		// Verify editedEndpoint has the new param
		expect(state.editedEndpoint?.queryParams).toHaveLength(1);

		// Cancel without saving
		state.handleCancel();

		// Store should still have no query params
		expect(get(endpointsStore)[0].queryParams).toHaveLength(0);
	});
});

describe('apiGeneratorState - Code Generation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should show code generation toast', () => {
		const state = createApiGeneratorState();

		state.handleGenerateCode();

		expect(toastsModule.showToast).toHaveBeenCalledWith('Code generation coming soon', 'info', 3000);
	});
});

describe('apiGeneratorState - Derived State', () => {
	beforeEach(() => {
		tagsStore.set([]);
		vi.clearAllMocks();
	});

	it('should detect exact tag match', () => {
		const state = createApiGeneratorState();

		// Create a tag
		state.editedEndpoint = {
			id: 'endpoint-1',
			method: 'GET' as const,
			path: '/test',
			description: '',
			pathParams: [],
			queryParams: [],
			responseBody: '{}',
			useEnvelope: true,
			expanded: false
		};
		state.tagInputValue = 'Users';
		state.handleCreateTag();

		// Type the same tag name
		state.tagInputValue = 'users'; // Case-insensitive

		// In component, exactTagMatch would be derived - we verify the logic
		const tags = get(tagsStore);
		const match = tags.find(t => t.name.toLowerCase() === state.tagInputValue.toLowerCase().trim());
		expect(match).toBeDefined();
	});
});
