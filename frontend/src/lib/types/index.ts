export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  imageUrl?: string;
  email?: string;
}

export interface ClerkState {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: User | null;
}

// Organization types for Clerk Organizations support
export interface Organization {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  id: string;
  role: string;
  organization: Organization;
  createdAt: string;
  updatedAt: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
  children?: NavItem[];
}

// Filter types for search components
export type FilterType = 'checkbox-group' | 'toggle';

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterSectionBase {
  key: string;
  label: string;
  // Optional custom predicate function for filtering logic
  // If not provided, default behavior applies (direct property matching)
  predicate?: (item: any, filterValue: any) => boolean;
}

export interface CheckboxGroupSection extends FilterSectionBase {
  type: 'checkbox-group';
  options: FilterOption[];
}

export interface ToggleSection extends FilterSectionBase {
  type: 'toggle';
  toggleLabel?: string;
}

export type FilterSection = CheckboxGroupSection | ToggleSection;

export type FilterConfig = FilterSection[];

// Reference handling types for deletion safety
export interface Reference {
  id: string;
  name: string;
  type: 'field' | 'api' | 'field-constraint';
}

export interface DeletionResult {
  success: boolean;
  error?: string;
  references?: Reference[];
}

// Toast notification types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

// Namespace types
export interface Namespace {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean; // true for the user's default namespace
  locked: boolean; // true for system namespaces (e.g. Global); read-only in the UI
}

// API Generator types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// Response shape types
// Request body: ONLY single object (no arrays, no primitives)
// Response body: ONLY object or array of objects (no primitives)
export type ResponseShape = 'object' | 'list';
export const RESPONSE_SHAPES: ResponseShape[] = ['object', 'list'];
export type ResponseItemShape = 'object'; // Only objects allowed in lists

// Filter operator types for query parameter inference
export type FilterOperator = 'eq' | 'gte' | 'lte' | 'gt' | 'lt' | 'like' | 'ilike' | 'in';

export const FILTER_OPERATORS: FilterOperator[] = ['eq', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike', 'in'];

// Type categories for operator compatibility (values are type names from the types store)
export const NUMERIC_TYPES = ['int', 'float', 'Decimal'] as const;
export const COMPARABLE_TYPES = [...NUMERIC_TYPES, 'date', 'datetime', 'time'] as const;
export const STRING_TYPES = ['str'] as const;

// Map of which operators are valid for which type categories
export const OPERATOR_TYPE_COMPATIBILITY: Record<FilterOperator, 'all' | 'comparable' | 'string'> = {
  eq: 'all',
  gte: 'comparable',
  lte: 'comparable',
  gt: 'comparable',
  lt: 'comparable',
  like: 'string',
  ilike: 'string',
  in: 'all'
};

export interface Api {
  id: string;
  namespaceId: string;
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  serverUrl: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Path parameter referencing a field on the target object.
 * `fieldId` is kept for backward compat during migration; `field` is the
 * target-object field name used by the new inference system.
 */
export interface PathParam {
  name: string;
  fieldId: string;     // legacy: global field ID (kept for backward compat)
  field: string;       // NEW: field name on the target object
}

/**
 * Query parameter with field mapping and filter operator.
 * Pagination is handled at the endpoint level, not per-param.
 */
export interface QueryParam {
  name: string;
  field: string;       // field name on the target object
  operator: FilterOperator; // filter operation
}

export interface ApiEndpoint {
  id: string;
  apiId: string;
  method: HttpMethod;
  path: string;
  description: string;
  tagName?: string;  // Tag name reference (string, not UUID)
  pathParams: PathParam[];
  queryParams: QueryParam[];           // NEW: replaces queryParamsObjectId
  queryParamsObjectId?: string;        // DEPRECATED: kept for backward compat during migration
  objectId?: string; // Select ONE object for request/response body; also the target for param inference
  useEnvelope: boolean;
  // Response shape configuration (object or list of objects only)
  responseShape: ResponseShape;
  pagination?: boolean;                // When true, auto-injects limit/offset params (list endpoints only)
  expanded?: boolean;
}

// Object Builder types

export type FieldRole =
  | 'pk'                  // Primary key — type-constrained to int or uuid
  | 'fk'                  // Foreign key — auto-managed reference to another object (name/type locked)
  | 'writable'            // Standard read/write field
  | 'write_only'          // Input-only, never returned (e.g. passwords)
  | 'read_only'           // Response-only, set by app logic
  | 'created_timestamp'   // Auto-set to NOW on insert — type-constrained to datetime/date
  | 'updated_timestamp'   // Auto-refreshed to NOW on update — type-constrained to datetime/date
  | 'generated_uuid';     // Auto-generated UUID (non-PK) — type-constrained to uuid

export const FIELD_ROLES: FieldRole[] = [
  'pk', 'fk', 'writable', 'write_only', 'read_only',
  'created_timestamp', 'updated_timestamp', 'generated_uuid'
];

export const ROLE_LABELS: Record<FieldRole, string> = {
  pk: 'Primary Key',
  fk: 'Foreign Key',
  writable: 'Writable',
  write_only: 'Write-only',
  read_only: 'Read-only',
  created_timestamp: 'Created Timestamp',
  updated_timestamp: 'Updated Timestamp',
  generated_uuid: 'Generated UUID',
};

export const ROLE_TOOLTIPS: Record<FieldRole, string> = {
  pk: 'System-generated unique identifier for this record.',
  fk: 'Auto-managed reference to another object. Name and type are locked.',
  writable: 'Standard field — clients send it and receive it back.',
  write_only: 'Input-only field never returned in responses (e.g. password).',
  read_only: 'Response-only field set by application logic.',
  created_timestamp: 'Timestamp set automatically when the record is first created.',
  updated_timestamp: 'Timestamp refreshed automatically every time the record changes.',
  generated_uuid: 'A unique UUID generated automatically by the server (non-PK).',
};

export const ROLE_TYPE_CONSTRAINTS: Partial<Record<FieldRole, string[]>> = {
  pk: ['int', 'uuid', 'uuid.UUID'],
  fk: ['int', 'uuid', 'uuid.UUID'],
  created_timestamp: ['datetime', 'date', 'datetime.datetime', 'datetime.date'],
  updated_timestamp: ['datetime', 'date', 'datetime.datetime', 'datetime.date'],
  generated_uuid: ['uuid', 'uuid.UUID'],
};

/** Returns the valid roles for a given field type */
export function getAvailableRoles(fieldType: string): FieldRole[] {
  return FIELD_ROLES.filter(role => {
    if (role === 'fk') return false;  // auto-assigned only, not user-selectable
    const constraint = ROLE_TYPE_CONSTRAINTS[role];
    if (!constraint) return true;
    return constraint.includes(fieldType);
  });
}

/** Whether the role allows optional and defaultValue modifiers */
export function roleHasModifiers(role: FieldRole): boolean {
  return role === 'writable' || role === 'write_only' || role === 'read_only' || role === 'fk';
}

export interface ObjectFieldReference {
  fieldId: string;
  role: FieldRole;
  optional: boolean;
  defaultValue?: string | null;
}

export type Cardinality = 'has_one' | 'has_many' | 'references' | 'many_to_many';

export interface ObjectRelationship {
  id: string;
  sourceObjectId: string;
  targetObjectId: string;
  name: string;
  cardinality: Cardinality;
  isInferred: boolean;
  inverseId?: string;
  fkFieldId?: string;
}

export interface ObjectDefinition {
  id: string;
  namespaceId: string;
  name: string;
  description?: string;
  fields: ObjectFieldReference[];
  relationships: ObjectRelationship[];
  validators: InlineModelValidator[];
  usedInApis: string[];
}

// Field types

export interface FieldConstraintValue {
  name: string;
  constraintId: string;
  value: string | null;
}

export interface Field {
  id: string;
  namespaceId: string;
  name: string;
  type: string;
  container: string | null;
  description?: string;
  defaultValue?: string;
  constraints: FieldConstraintValue[];
  validators: InlineFieldValidator[];
  usedInApis: string[];
}

export const CONTAINER_VALUES = ['List'] as const;

// Field constraint types
export interface FieldConstraintBase {
  id: string;
  namespaceId: string;
  name: string;
  description: string;
  parameterTypes: string[];
  docsUrl: string | null;
  compatibleTypes: string[];
}

// Inline validator types (child rows of fields/objects, not standalone entities)
export interface InlineFieldValidator {
  id: string;
  templateId: string;
  parameters: Record<string, string> | null;
}

export interface InlineModelValidator {
  id: string;
  templateId: string;
  parameters: Record<string, string> | null;
  fieldMappings: Record<string, string>;
}

// Validator template catalogue types (backend-served reference data)
export interface TemplateParameter {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder: string;
  options?: SelectOption[];
  required: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldMappingDefinition {
  key: string;
  label: string;
  compatibleTypes: string[];
  required: boolean;
}

export const VALIDATOR_MODES = ['before', 'after'] as const;

export interface FieldValidatorTemplate {
  id: string;
  name: string;
  description: string;
  compatibleTypes: string[];
  mode: 'before' | 'after';
  parameters: TemplateParameter[];
  bodyTemplate: string;
}

export interface ModelValidatorTemplate {
  id: string;
  name: string;
  description: string;
  mode: 'before' | 'after';
  parameters: TemplateParameter[];
  fieldMappings: FieldMappingDefinition[];
  bodyTemplate: string;
}

/** Result of a graph mutation (relationship create/delete) with all side effects */
export interface GraphMutationResult {
  updatedObjects: ObjectDefinition[];
  createdFields: Field[];
  deletedFieldIds: string[];
}
