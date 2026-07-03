/**
 * GROUPING TYPES
 * 
 * Groups organize clips visually without affecting edit behavior.
 * Unlike link groups, groups are for organization only.
 */

import type { ClipId } from './clip';

// ---------------------------------------------------------------------------
// Branded ID
// ---------------------------------------------------------------------------

export type GroupId = string & { readonly __brand: 'GroupId' };
export const toGroupId = (s: string): GroupId => s as GroupId;

/**
 * Group - organizes clips visually
 */
export interface Group {
  id: GroupId;
  name: string;
  clipIds: readonly ClipId[];
  parentGroupId?: string; // For nested groups
  color?: string;
  collapsed?: boolean; // UI hint
}
