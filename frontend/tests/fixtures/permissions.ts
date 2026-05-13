/**
 * Permission Fixtures
 * 
 * Mock permission and role data for testing authorization features.
 */

export interface Permission {
	id: string;
	name: string;
	resource: string;
	action: 'create' | 'read' | 'update' | 'delete';
	description: string;
}

export interface Role {
	id: string;
	name: string;
	description: string;
	permissions: string[]; // Permission IDs
}

export const mockPermissions: Permission[] = [
	{
		id: 'perm-1',
		name: 'create_field',
		resource: 'field',
		action: 'create',
		description: 'Can create new fields'
	},
	{
		id: 'perm-2',
		name: 'read_field',
		resource: 'field',
		action: 'read',
		description: 'Can view fields'
	},
	{
		id: 'perm-3',
		name: 'update_field',
		resource: 'field',
		action: 'update',
		description: 'Can edit fields'
	},
	{
		id: 'perm-4',
		name: 'delete_field',
		resource: 'field',
		action: 'delete',
		description: 'Can delete fields'
	},
	{
		id: 'perm-5',
		name: 'create_api',
		resource: 'api',
		action: 'create',
		description: 'Can create new APIs'
	},
	{
		id: 'perm-6',
		name: 'read_api',
		resource: 'api',
		action: 'read',
		description: 'Can view APIs'
	},
	{
		id: 'perm-7',
		name: 'update_api',
		resource: 'api',
		action: 'update',
		description: 'Can edit APIs'
	},
	{
		id: 'perm-8',
		name: 'delete_api',
		resource: 'api',
		action: 'delete',
		description: 'Can delete APIs'
	}
];

export const mockRoles: Role[] = [
	{
		id: 'role-1',
		name: 'admin',
		description: 'Full system access',
		permissions: mockPermissions.map((p) => p.id)
	},
	{
		id: 'role-2',
		name: 'developer',
		description: 'Can create and edit fields and APIs',
		permissions: ['perm-1', 'perm-2', 'perm-3', 'perm-5', 'perm-6', 'perm-7']
	},
	{
		id: 'role-3',
		name: 'viewer',
		description: 'Read-only access',
		permissions: ['perm-2', 'perm-6']
	}
];

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(roleId: string): Permission[] {
	const role = mockRoles.find((r) => r.id === roleId);
	if (!role) return [];

	return mockPermissions.filter((p) => role.permissions.includes(p.id));
}

/**
 * Check if role has permission
 */
export function roleHasPermission(roleId: string, permissionId: string): boolean {
	const role = mockRoles.find((r) => r.id === roleId);
	if (!role) return false;

	return role.permissions.includes(permissionId);
}
