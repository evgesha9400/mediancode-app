import { describe, it, expect } from 'vitest';
import {
	getAvailableRoles,
	roleHasModifiers,
	FIELD_ROLES,
	ROLE_LABELS,
	ROLE_TOOLTIPS,
	ROLE_TYPE_CONSTRAINTS
} from '$lib/types';

describe('FieldRole type system', () => {
	describe('getAvailableRoles', () => {
		it('should never return fk for any field type', () => {
			const typesToTest = ['str', 'int', 'float', 'bool', 'uuid', 'datetime', 'date', 'time'];
			for (const type of typesToTest) {
				const roles = getAvailableRoles(type);
				expect(roles).not.toContain('fk');
			}
		});

		it('should return pk for int type', () => {
			expect(getAvailableRoles('int')).toContain('pk');
		});

		it('should return pk for uuid type', () => {
			expect(getAvailableRoles('uuid')).toContain('pk');
		});

		it('should not return pk for str type', () => {
			expect(getAvailableRoles('str')).not.toContain('pk');
		});
	});

	describe('roleHasModifiers', () => {
		it('should return false for fk role', () => {
			expect(roleHasModifiers('fk')).toBe(false);
		});

		it('should return true for writable role', () => {
			expect(roleHasModifiers('writable')).toBe(true);
		});

		it('should return true for write_only role', () => {
			expect(roleHasModifiers('write_only')).toBe(true);
		});

		it('should return true for read_only role', () => {
			expect(roleHasModifiers('read_only')).toBe(true);
		});

		it('should return false for pk role', () => {
			expect(roleHasModifiers('pk')).toBe(false);
		});

		it('should return false for created_timestamp role', () => {
			expect(roleHasModifiers('created_timestamp')).toBe(false);
		});
	});

	describe('FIELD_ROLES constant', () => {
		it('should include fk in the roles array', () => {
			expect(FIELD_ROLES).toContain('fk');
		});
	});

	describe('ROLE_LABELS', () => {
		it('should have a label for fk', () => {
			expect(ROLE_LABELS.fk).toBe('Foreign Key');
		});
	});

	describe('ROLE_TOOLTIPS', () => {
		it('should have a tooltip for fk', () => {
			expect(ROLE_TOOLTIPS.fk).toBeDefined();
			expect(ROLE_TOOLTIPS.fk.length).toBeGreaterThan(0);
		});
	});

	describe('ROLE_TYPE_CONSTRAINTS', () => {
		it('should constrain fk to int and uuid types', () => {
			const constraints = ROLE_TYPE_CONSTRAINTS.fk;
			expect(constraints).toBeDefined();
			expect(constraints).toContain('int');
			expect(constraints).toContain('uuid');
		});
	});
});
