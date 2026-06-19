import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { hasGlobalAuditAccess } from './audit-access';

describe('hasGlobalAuditAccess', () => {
  it('returns true when user role is Business Operations', () => {
    const user = { id: '1', role: 'Business Operations' };
    assert.strictEqual(hasGlobalAuditAccess(user), true);
  });

  it('returns false when user role is IT Administrator', () => {
    const user = { id: '2', role: 'IT Administrator' };
    assert.strictEqual(hasGlobalAuditAccess(user), false);
  });

  it('returns false when user role is Standard User', () => {
    const user = { id: '3', role: 'Standard User' };
    assert.strictEqual(hasGlobalAuditAccess(user), false);
  });

  it('returns false when user role is empty string', () => {
    const user = { id: '4', role: '' };
    assert.strictEqual(hasGlobalAuditAccess(user), false);
  });
});
