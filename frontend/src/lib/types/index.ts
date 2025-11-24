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
