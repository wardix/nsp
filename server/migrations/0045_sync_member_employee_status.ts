import type { Migration } from "./types";

/**
 * Migration 0045: Backfill and synchronize cooperative membership status (is_member, member_id)
 * from members table to employees table based on NIK or email match.
 */
export function createSyncMemberEmployeeStatusMigration(db: {
  run: (q: string, args?: unknown[]) => Promise<void>;
}): Migration {
  return {
    name: "0045_sync_member_employee_status",
    async up() {
      await db.run(`
        UPDATE employees e
        SET member_id = m.id,
            is_member = true,
            updated_at = NOW()
        FROM members m
        WHERE (
          (e.nik IS NOT NULL AND e.nik != '' AND m.nik IS NOT NULL AND m.nik != '' AND m.nik = e.nik)
          OR (e.email IS NOT NULL AND e.email != '' AND m.email IS NOT NULL AND m.email != '' AND LOWER(m.email) = LOWER(e.email))
        )
        AND m.deletedAt IS NULL
        AND m.status = 'Aktif'
      `);
    },
  };
}
