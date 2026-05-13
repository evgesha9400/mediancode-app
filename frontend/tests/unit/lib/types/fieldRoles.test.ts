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
		it('should NOT contain fk', () => {
			expect(FIELD_ROLES).not.toContain('fk');
		});

		it('should contain all valid roles', () => {
			expect(FIELD_ROLES).toContain('pk');
			expect(FIELD_ROLES).toContain('writable');
			expect(FIELD_ROLES).toContain('write_only');
			expect(FIELD_ROLES).toContain('read_only');
			expect(FIELD_ROLES).toContain('created_timestamp');
			expect(FIELD_ROLES).toContain('updated_timestamp');
			expect(FIELD_ROLES).toContain('generated_uuid');
		});
	});

	describe('ROLE_LABELS', () => {
		it('should have a label for pk', () => {
			expect(ROLE_LABELS.pk).toBe('Primary Key');
		});

		it('should have a label for writable', () => {
			expect(ROLE_LABELS.writable).toBe('Writable');
		});
	});

	describe('ROLE_TOOLTIPS', () => {
		it('should have a tooltip for pk', () => {
			expect(ROLE_TOOLTIPS.pk).toBeDefined();
			expect(ROLE_TOOLTIPS.pk.length).toBeGreaterThan(0);
		});
	});

	describe('ROLE_TYPE_CONSTRAINTS', () => {
		it('should constrain pk to int and uuid types', () => {
			const constraints = ROLE_TYPE_CONSTRAINTS.pk;
			expect(constraints).toBeDefined();
			expect(constraints).toContain('int');
			expect(constraints).toContain('uuid');
		});

		it('should not have fk constraint', () => {
			expect(ROLE_TYPE_CONSTRAINTS).not.toHaveProperty('fk');
		});
	});
});
