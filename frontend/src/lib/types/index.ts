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

// Response shape types
// Request body: ONLY single object (no arrays, no primitives)
// Response body: ONLY object or array of objects (no primitives)
export type ResponseShape = 'object' | 'list';
export type ResponseItemShape = 'object'; // Only objects allowed in lists

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
 * Path parameter referencing a field definition
 */
export interface PathParam {
  name: string;
  fieldId: string;
}

export interface ApiEndpoint {
  id: string;
  apiId: string;
  method: HttpMethod;
  path: string;
  description: string;
  tagName?: string;  // Tag name reference (string, not UUID)
  pathParams: PathParam[];
  queryParamsObjectId?: string; // Select ONE object for query parameters (optional)
  requestBodyObjectId?: string; // Select ONE object for request body (optional - only POST/PUT/PATCH methods)
  responseBodyObjectId?: string; // Select ONE object for response body (for both single object and array of objects)
  useEnvelope: boolean;
  // Response shape configuration (object or list of objects only)
  responseShape: ResponseShape;
  expanded?: boolean;
}

// Object Builder types
export interface ObjectFieldReference {
  fieldId: string;
  optional: boolean;
}

export interface ObjectDefinition {
  id: string;
  namespaceId: string;
  name: string;
  description?: string;
  fields: ObjectFieldReference[];
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
