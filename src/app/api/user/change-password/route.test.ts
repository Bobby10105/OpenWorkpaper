import { describe, it, expect } from 'vitest';
import { validatePassword } from './route';

describe('validatePassword', () => {
  it('should return true for a valid password', () => {
    // Length >= 12, uppercase, lowercase, number, special character
    expect(validatePassword('Abcd!1234567')).toBe(true);
    expect(validatePassword('SuperS3cret!@#')).toBe(true);
  });

  it('should return false for passwords that are too short', () => {
    // Less than 12 characters (but otherwise valid)
    expect(validatePassword('Abcd!12345')).toBe(false); // 10 chars
    expect(validatePassword('Ab!1')).toBe(false);       // 4 chars
  });

  it('should return false for passwords without an uppercase letter', () => {
    expect(validatePassword('abcd!1234567')).toBe(false);
  });

  it('should return false for passwords without a lowercase letter', () => {
    expect(validatePassword('ABCD!1234567')).toBe(false);
  });

  it('should return false for passwords without a number', () => {
    expect(validatePassword('Abcd!efghijk')).toBe(false);
  });

  it('should return false for passwords without a special character', () => {
    expect(validatePassword('Abcd12345678')).toBe(false);
  });
});
