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

// API Generator types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Response shape types
export type ResponseShape = 'object' | 'primitive' | 'list';
export type ResponseItemShape = 'object' | 'primitive';

export interface ApiMetadata {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  serverUrl: string;
}

export interface EndpointTag {
  id: string;
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
  method: HttpMethod;
  path: string;
  description: string;
  tagId?: string;
  pathParams: EndpointParameter[];
  queryParams: EndpointParameter[];
  requestBodyFieldIds: string[];
  responseBodyFieldIds: string[];
  useEnvelope: boolean;
  // Response shape configuration
  responseShape: ResponseShape;
  responseItemShape: ResponseItemShape;
  responsePrimitiveFieldId?: string;
  expanded?: boolean;
}
