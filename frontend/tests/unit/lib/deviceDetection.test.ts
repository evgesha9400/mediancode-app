import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isMobileDevice, getDeviceType } from '$lib/deviceDetection';

describe('deviceDetection', () => {
  const originalWindow = global.window;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isMobileDevice', () => {
    it('should return false on server (no window)', () => {
      const win = global.window;
      // @ts-ignore
      delete global.window;
      expect(isMobileDevice()).toBe(false);
      global.window = win;
    });

    it('should return false for desktop browser', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        vendor: '',
        maxTouchPoints: 0
      });
      vi.stubGlobal('innerWidth', 1440);
      expect(isMobileDevice()).toBe(false);
    });

    it('should return true for iPhone user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)',
        vendor: 'Apple Computer, Inc.',
        maxTouchPoints: 5
      });
      vi.stubGlobal('innerWidth', 390);
      expect(isMobileDevice()).toBe(true);
    });

    it('should return true for Android user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7)',
        vendor: '',
        maxTouchPoints: 5
      });
      vi.stubGlobal('innerWidth', 412);
      expect(isMobileDevice()).toBe(true);
    });

    it('should return true for small screen with touch', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Unknown Device)',
        vendor: '',
        maxTouchPoints: 2
      });
      vi.stubGlobal('innerWidth', 800);
      expect(isMobileDevice()).toBe(true);
    });
  });

  describe('getDeviceType', () => {
    it('should return desktop on server (no window)', () => {
      const win = global.window;
      // @ts-ignore
      delete global.window;
      expect(getDeviceType()).toBe('desktop');
      global.window = win;
    });

    it('should return mobile for iPhone user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)',
        vendor: 'Apple Computer, Inc.'
      });
      vi.stubGlobal('innerWidth', 390);
      expect(getDeviceType()).toBe('mobile');
    });

    it('should return tablet for iPad user agent with wide screen', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X)',
        vendor: 'Apple Computer, Inc.'
      });
      vi.stubGlobal('innerWidth', 810);
      expect(getDeviceType()).toBe('tablet');
    });

    it('should return mobile for narrow screen', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Unknown)',
        vendor: ''
      });
      vi.stubGlobal('innerWidth', 500);
      expect(getDeviceType()).toBe('mobile');
    });

    it('should return tablet for medium screen', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Unknown)',
        vendor: ''
      });
      vi.stubGlobal('innerWidth', 900);
      expect(getDeviceType()).toBe('tablet');
    });

    it('should return desktop for wide screen', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        vendor: ''
      });
      vi.stubGlobal('innerWidth', 1440);
      expect(getDeviceType()).toBe('desktop');
    });
  });
});
