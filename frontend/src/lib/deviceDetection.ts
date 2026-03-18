export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // Check user agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

  // Check screen width (tablets and phones)
  const isSmallScreen = window.innerWidth < 1024;

  // Check touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return mobileRegex.test(userAgent) || (isSmallScreen && isTouchDevice);
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Check for mobile phones
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    return 'mobile';
  }

  // Check for tablets
  if (/iPad|Android/i.test(userAgent) && width >= 768) {
    return 'tablet';
  }

  // Check by screen width
  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  }

  return 'desktop';
}
