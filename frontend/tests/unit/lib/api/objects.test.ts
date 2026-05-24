import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn()
}));

import {
  listObjects,
  getObject,
  createObjectApi,
  updateObjectApi,
  deleteObjectApi
} from '$lib/api/objects';
import { apiGet, apiPost, apiPut, apiDelete } from '$lib/api/client';

const MOCK_OBJECT_RESPONSE = {
  id: 'o-1',
  namespaceId: 'ns-1',
  name: 'User',
  description: 'User model',
  members: [
    { memberType: 'field', id: 'm-1', name: 'email', fieldId: 'f-1', role: 'writable', isNullable: false, defaultValue: null },
    { memberType: 'field', id: 'm-2', name: 'username', fieldId: 'f-2', role: 'writable', isNullable: true, defaultValue: null }
  ],
  derivedRelationships: [],
  validators: [],
  usedInApis: ['api-1']
};

describe('Objects API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listObjects', () => {
    it('should list all objects', async () => {
      (apiGet as any).mockResolvedValue([MOCK_OBJECT_RESPONSE]);

      const result = await listObjects();

      expect(apiGet).toHaveBeenCalledWith('/objects');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('User');
      expect(result[0].members).toHaveLength(2);
    });

    it('should transform model validators with template data', async () => {
      const responseWithValidators = {
        ...MOCK_OBJECT_RESPONSE,
        validators: [
          {
            id: 'v-1',
            templateId: 'tmpl-password-confirm',
            parameters: null,
            fieldMappings: { password_field: 'password', confirm_field: 'confirm_password' }
          }
        ]
      };
      (apiGet as any).mockResolvedValue([responseWithValidators]);

      const result = await listObjects();

      expect(result[0].validators).toHaveLength(1);
      expect(result[0].validators[0]).toEqual({
        id: 'v-1',
        templateId: 'tmpl-password-confirm',
        parameters: null,
        fieldMappings: { password_field: 'password', confirm_field: 'confirm_password' }
      });
    });

    it('should filter by namespace', async () => {
      (apiGet as any).mockResolvedValue([]);

      await listObjects('ns-1');

      expect(apiGet).toHaveBeenCalledWith('/objects?namespace_id=ns-1');
    });
  });

  describe('getObject', () => {
    it('should get object by ID and transform', async () => {
      (apiGet as any).mockResolvedValue({ ...MOCK_OBJECT_RESPONSE, description: null });

      const result = await getObject('o-1');

      expect(apiGet).toHaveBeenCalledWith('/objects/o-1');
      expect(result.description).toBeUndefined();
    });
  });

  describe('createObjectApi', () => {
    it('should create object', async () => {
      (apiPost as any).mockResolvedValue(MOCK_OBJECT_RESPONSE);

      const result = await createObjectApi({
        namespaceId: 'ns-1',
        name: 'User',
        members: [{ memberType: 'field' as const, name: 'email', fieldId: 'f-1', role: 'writable' as const, isNullable: false }]
      });

      expect(apiPost).toHaveBeenCalledWith('/objects', expect.any(Object));
      expect(result.id).toBe('o-1');
    });
  });

  describe('updateObjectApi', () => {
    it('should update object', async () => {
      (apiPut as any).mockResolvedValue({ ...MOCK_OBJECT_RESPONSE, name: 'Updated' });

      const result = await updateObjectApi('o-1', { name: 'Updated' });

      expect(apiPut).toHaveBeenCalledWith('/objects/o-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteObjectApi', () => {
    it('should delete object', async () => {
      (apiDelete as any).mockResolvedValue(undefined);

      await deleteObjectApi('o-1');

      expect(apiDelete).toHaveBeenCalledWith('/objects/o-1');
    });
  });

  describe('transformMember', () => {
    it('should transform field members correctly', async () => {
      (apiGet as any).mockResolvedValue([MOCK_OBJECT_RESPONSE]);

      const result = await listObjects();
      const member = result[0].members[0];

      expect(member.memberType).toBe('field');
      if (member.memberType === 'field') {
        expect(member.id).toBe('m-1');
        expect(member.name).toBe('email');
        expect(member.fieldId).toBe('f-1');
        expect(member.role).toBe('writable');
        expect(member.isNullable).toBe(false);
      }
    });

    it('should transform relationship members correctly', async () => {
      const responseWithRel = {
        ...MOCK_OBJECT_RESPONSE,
        members: [
          ...MOCK_OBJECT_RESPONSE.members,
          {
            memberType: 'relationship',
            id: 'm-3',
            name: 'orders',
            targetObjectId: 'o-2',
            kind: 'one_to_many',
            inverseName: 'user',
            required: true
          }
        ]
      };
      (apiGet as any).mockResolvedValue([responseWithRel]);

      const result = await listObjects();
      const relMember = result[0].members[2];

      expect(relMember.memberType).toBe('relationship');
      if (relMember.memberType === 'relationship') {
        expect(relMember.id).toBe('m-3');
        expect(relMember.name).toBe('orders');
        expect(relMember.targetObjectId).toBe('o-2');
        expect(relMember.kind).toBe('one_to_many');
        expect(relMember.inverseName).toBe('user');
        expect(relMember.required).toBe(true);
      }
    });
  });

  describe('transformDerivedRelationship', () => {
    it('should transform one_to_many derived relationship', async () => {
      const responseWithDerived = {
        ...MOCK_OBJECT_RESPONSE,
        derivedRelationships: [
          {
            name: 'customer',
            sourceObjectId: 'o-3',
            sourceObject: 'Customer',
            sourceField: 'orders',
            kind: 'one_to_many',
            side: 'many',
            required: true
          }
        ]
      };
      (apiGet as any).mockResolvedValue([responseWithDerived]);

      const result = await listObjects();
      const dr = result[0].derivedRelationships[0];

      expect(dr.name).toBe('customer');
      expect(dr.sourceObjectId).toBe('o-3');
      expect(dr.sourceObject).toBe('Customer');
      expect(dr.kind).toBe('one_to_many');
      expect(dr.side).toBe('many');
    });

    it('should transform many_to_many derived relationship', async () => {
      const responseWithM2M = {
        ...MOCK_OBJECT_RESPONSE,
        derivedRelationships: [
          {
            name: 'posts',
            sourceObjectId: 'o-4',
            sourceObject: 'Post',
            sourceField: 'tags',
            kind: 'many_to_many',
            side: 'many',
            required: false
          }
        ]
      };
      (apiGet as any).mockResolvedValue([responseWithM2M]);

      const result = await listObjects();
      const dr = result[0].derivedRelationships[0];

      expect(dr.kind).toBe('many_to_many');
      expect(dr.required).toBe(false);
    });

    it('should transform one_to_one derived relationship', async () => {
      const responseWithO2O = {
        ...MOCK_OBJECT_RESPONSE,
        derivedRelationships: [
          {
            name: 'user',
            sourceObjectId: 'o-5',
            sourceObject: 'User',
            sourceField: 'profile',
            kind: 'one_to_one',
            side: 'target',
            required: true
          }
        ]
      };
      (apiGet as any).mockResolvedValue([responseWithO2O]);

      const result = await listObjects();
      const dr = result[0].derivedRelationships[0];

      expect(dr.kind).toBe('one_to_one');
      expect(dr.side).toBe('target');
    });
  });
});
