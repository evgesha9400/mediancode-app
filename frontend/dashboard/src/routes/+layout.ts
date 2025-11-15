import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';

export const load = () => {
  return {
    clerkPublishableKey: PUBLIC_CLERK_PUBLISHABLE_KEY
  };
};
