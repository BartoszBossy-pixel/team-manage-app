import { describe, it, expect } from 'vitest';
import { generateUserColor, getInitials, getAvatarStyle } from './avatarUtils';

// ─── generateUserColor ────────────────────────────────────────────────────────

describe('generateUserColor', () => {
  it('returns default gray for empty string', () => {
    expect(generateUserColor('')).toBe('#6b7280');
  });

  it('returns a hex color string', () => {
    expect(generateUserColor('Alice')).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('returns the same color for the same name (deterministic)', () => {
    expect(generateUserColor('John Doe')).toBe(generateUserColor('John Doe'));
  });

  it('returns different colors for different names', () => {
    // The hash distributes well enough that these two should differ
    expect(generateUserColor('Alice')).not.toBe(generateUserColor('Zzzzzzz'));
  });

  it('is stable across many typical dev names', () => {
    const names = ['Bartosz Bossy', 'Alicja Wolnik', 'Krzysztof Rak', 'Oliwer Pawelski'];
    names.forEach(name => {
      const color = generateUserColor(name);
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      // Re-run to verify determinism
      expect(generateUserColor(name)).toBe(color);
    });
  });
});

// ─── getInitials ──────────────────────────────────────────────────────────────

describe('getInitials', () => {
  it('returns UN for empty string', () => {
    expect(getInitials('')).toBe('UN');
  });

  it('returns first + last initial for two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('returns first + last initial for three-word name', () => {
    expect(getInitials('John Middle Doe')).toBe('JD');
  });

  it('returns first 2 chars for single-word name', () => {
    expect(getInitials('Alice')).toBe('AL');
  });

  it('returns uppercase initials regardless of input case', () => {
    expect(getInitials('alice bob')).toBe('AB');
  });

  it('handles Polish names correctly', () => {
    expect(getInitials('Bartosz Bossy')).toBe('BB');
    expect(getInitials('Alicja Wolnik')).toBe('AW');
  });
});

// ─── getAvatarStyle ───────────────────────────────────────────────────────────

describe('getAvatarStyle', () => {
  it('returns an object (not null/undefined)', () => {
    expect(getAvatarStyle('Test')).toBeTruthy();
  });

  it('has expected shape for avatar rendering', () => {
    const style = getAvatarStyle('Test User');
    expect(style).toMatchObject({
      color: '#ffffff',
      fontWeight: 'bold',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      fontSize: '12px',
    });
  });

  it('backgroundColor equals generateUserColor output for the same name', () => {
    const name = 'Alicja Wolnik';
    expect(getAvatarStyle(name).backgroundColor).toBe(generateUserColor(name));
  });

  it('backgroundColor is a valid hex color', () => {
    expect(getAvatarStyle('Random Name').backgroundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
