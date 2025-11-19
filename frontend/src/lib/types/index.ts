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

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
}

export interface ActivityItemProps {
  icon: string;
  title: string;
  name: string;
  description: string;
  time: string;
  showBorder?: boolean;
}

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
}
