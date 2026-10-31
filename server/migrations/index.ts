import type { Migration } from "./types";
import { createBaselineMigration } from "./001_baseline";
import { createConvertCurrencyMigration } from "./0003_convert_currency_to_int";
import { createHashAdminPasswordsMigration } from "./0004_hash_admin_passwords";
import { createLoanTermSnapshotsMigration } from "./0008_loan_term_snapshots";
import { createLoanSchedulesMigration } from "./0009_add_loan_schedules";
import { createShuClosingMigration } from "./0010_shu_configurable_and_closing";
import { createSavingsConstraintsMigration } from "./0011_add_savings_constraints";
import { createAddAuditLogsMigration } from "./0012_add_audit_logs";
import { createAddTotp2FaMigration } from "./0013_add_totp_2fa";
import { createAddJTiBlacklistMigration } from "./0014_add_jti_blacklist";
import { createSoftDeleteMigration } from "./0015_soft_delete";
import { createMigration as createAddMemberLoginMigration } from "./0016_add_member_login";
import { createMigration as createAddNotificationLogsMigration } from "./0017_add_notification_logs";
import { createAddExpensesMigration } from "./0018_add_expenses";
import { createRegenerateLoanSchedulesAnnuityMigration } from "./0019_regenerate_loan_schedules_annuity";
import { createAddMemberNikMigration } from "./0020_add_member_nik";
import { createAddMemberPhoneMigration } from "./0021_add_member_phone";
import { createAddAccountingMigration } from "./0022_add_accounting";
import { createDropExpensesMigration } from "./0023_drop_expenses";
import { createAddTransactionSeqMigration } from "./0024_add_transaction_seq";
import { createAddEwaServiceMigration } from "./0025_add_ewa_service";
import { createAddLoanAttachmentMigration } from "./0026_add_loan_attachment";
import { createAddLettersManagementMigration } from "./0027_add_letters_management";
import { createUpdateEwaAccountCodeMigration } from "./0028_update_ewa_account_code";
import { createAddContractEndDateMigration } from "./0029_add_contract_end_date";
import { createEwaFeeTiersMigration } from "./0030_create_ewa_fee_tiers";
import { createAddKopnuteraMobileTablesMigration } from "./0031_add_kopnutera_mobile_tables";
import { createMergeEwaAndMobileTablesMigration } from "./0032_merge_ewa_and_mobile_tables";
import { createAddSavingsWithdrawalsMigration } from "./0033_add_savings_withdrawals";
import { createAddSavingsDepositsMigration } from "./0034_add_savings_deposits";
import { createAddCoopBankSettingsMigration } from "./0035_add_coop_bank_settings";
import { createAddShuAverageSavingsMigration } from "./0036_add_shu_average_savings";
import { createAddLoanRejectionReasonMigration } from "./0037_add_loan_rejection_reason";
import { createAddUserFeedbacksMigration } from "./0038_add_user_feedbacks";
import { createSyncLetterSequencesMigration } from "./0039_sync_letter_sequences";
import { createSetEwaJournalCreatorSystemMigration } from "./0040_set_ewa_journal_creator_system";
import { createFixDidiIrawanJournalDateMigration } from "./0041_fix_didi_irawan_journal_date";
import { createSetDefaultBungaPinjamanMigration } from "./0042_set_default_bunga_pinjaman";
import { createFixEwaSeptemberPayrollJournalDateMigration } from "./0043_fix_ewa_september_payroll_journal_date";
import { createFixEwaNullFeePercentageMigration } from "./0044_fix_ewa_null_fee_percentage";
import { createSyncMemberEmployeeStatusMigration } from "./0045_sync_member_employee_status";
import { runMigrations, listAppliedMigrations } from "./runner";

type AppDb = {
  run: (q: string, args?: unknown[]) => Promise<void>;
  query: (q: string) => {
    get: (...args: unknown[]) => Promise<unknown>;
    all: (...args: unknown[]) => Promise<unknown[]>;
  };
  prepare: (q: string) => { run: (...args: unknown[]) => Promise<void> };
  transaction: <TArgs extends unknown[], TResult>(
    cb: (...args: TArgs) => Promise<TResult> | TResult
  ) => (...args: TArgs) => Promise<TResult>;
};

/**
 * Pure DDL Schema Migrations.
 * These create and alter tables, constraints, and indexes without incidental production data hotfixes.
 * Guaranteed to execute cleanly on fresh databases without requiring specific user/record IDs.
 */
export function buildSchemaMigrations(db: AppDb): Migration[] {
  return [
    createBaselineMigration(db),
    createConvertCurrencyMigration(db),
    createHashAdminPasswordsMigration(db),
    createLoanTermSnapshotsMigration(db),
    createLoanSchedulesMigration(db),
    createShuClosingMigration(db),
    createSavingsConstraintsMigration(db),
    createAddAuditLogsMigration(db),
    createAddTotp2FaMigration(db),
    createAddJTiBlacklistMigration(db),
    createSoftDeleteMigration(db),
    createAddMemberLoginMigration(db),
    createAddNotificationLogsMigration(db),
    createAddExpensesMigration(db),
    createAddMemberNikMigration(db),
    createAddMemberPhoneMigration(db),
    createAddAccountingMigration(db),
    createDropExpensesMigration(db),
    createAddTransactionSeqMigration(db),
    createAddEwaServiceMigration(db),
    createAddLoanAttachmentMigration(db),
    createAddLettersManagementMigration(db),
    createUpdateEwaAccountCodeMigration(db),
    createAddContractEndDateMigration(db),
    createEwaFeeTiersMigration(db),
    createAddKopnuteraMobileTablesMigration(db),
    createMergeEwaAndMobileTablesMigration(db),
    createAddSavingsWithdrawalsMigration(db),
    createAddSavingsDepositsMigration(db),
    createAddCoopBankSettingsMigration(db),
    createAddShuAverageSavingsMigration(db),
    createAddLoanRejectionReasonMigration(db),
    createAddUserFeedbacksMigration(db),
    createSetDefaultBungaPinjamanMigration(db),
  ];
}

/**
 * Production Data Hotfixes & Incidental Patches.
 * Separated from DDL schema to avoid polluting clean dev/test environments
 * with specific user/transaction data assumptions.
 */
export function buildDataPatches(db: AppDb): Migration[] {
  return [
    createRegenerateLoanSchedulesAnnuityMigration(db),
    createSyncLetterSequencesMigration(db),
    createSetEwaJournalCreatorSystemMigration(db),
    createFixDidiIrawanJournalDateMigration(db),
    createFixEwaSeptemberPayrollJournalDateMigration(db),
    createFixEwaNullFeePercentageMigration(db),
    createSyncMemberEmployeeStatusMigration(db),
  ];
}

/** Ordered forward-only migrations (combining DDL schema and legacy data hotfixes for backward compatibility). */
export function buildMigrations(db: AppDb): Migration[] {
  return [...buildSchemaMigrations(db), ...buildDataPatches(db)];
}

/** Run pure DDL schema migrations only (ideal for clean database setups and test runs). */
export async function applySchemaMigrations(db: AppDb): Promise<string[]> {
  return runMigrations(db, buildSchemaMigrations(db));
}

/** Run production data patches only. */
export async function applyDataPatches(db: AppDb): Promise<string[]> {
  return runMigrations(db, buildDataPatches(db));
}

/** Run all migrations (schema + patches). */
export async function applyAllMigrations(db: AppDb): Promise<string[]> {
  return runMigrations(db, buildMigrations(db));
}

export { listAppliedMigrations, runMigrations };
export type { Migration };
