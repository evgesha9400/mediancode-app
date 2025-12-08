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

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
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
  type: 'field' | 'api' | 'validator';
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
  locked: boolean; // true for immutable global namespace
}

// API Generator types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Response shape types
// Request body: ONLY single object (no arrays, no primitives)
// Response body: ONLY object or array of objects (no primitives)
export type ResponseShape = 'object' | 'list';
export type ResponseItemShape = 'object'; // Only objects allowed in lists

export interface ApiMetadata {
  id: string;
  namespaceId: string;
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  serverUrl: string;
}

export interface EndpointTag {
  id: string;
  namespaceId: string;
  name: string;
  description: string;
}

export interface EndpointParameter {
  id: string;
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface ApiEndpoint {
  id: string;
  namespaceId: string;
  method: HttpMethod;
  path: string;
  description: string;
  tagId?: string;
  pathParams: EndpointParameter[];
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
  required: boolean;
}

export interface ObjectDefinition {
  id: string;
  namespaceId: string;
  name: string;
  description?: string;
  fields: ObjectFieldReference[];
  usedInApis: string[];
}
