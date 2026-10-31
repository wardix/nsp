import type { Db } from "../db";
import { ServiceError } from "./errors";
import { getLocalTodayYmd } from "../lib/dates";
import type { CompanyEmployee, EWARequest, EwaQuotaInfo, EwaFeeTier } from "../../shared/types";

export const EWA_MAX_PERCENTAGE = 50; // 50% from monthly base salary
export const EWA_MEMBER_FEE_PCT = 2.0; // 2.0% for Cooperative Members
export const EWA_NON_MEMBER_FEE_PCT = 3.5; // 3.5% for Non-Members

export async function getEwaFeeTiers(db: Db): Promise<EwaFeeTier[]> {
  const rows = await db
    .query(
      `SELECT 
        id, min_amount as "minAmount", max_amount as "maxAmount",
        member_fee as "memberFee", non_member_fee as "nonMemberFee",
        tier_order as "tierOrder", created_at as "createdAt", updated_at as "updatedAt"
       FROM ewa_fee_tiers
       ORDER BY tier_order ASC, min_amount ASC`
    )
    .all<any>();

  return rows.map((r) => ({
    id: r.id,
    minAmount: Number(r.minAmount),
    maxAmount: r.maxAmount != null ? Number(r.maxAmount) : null,
    memberFee: Number(r.memberFee),
    nonMemberFee: Number(r.nonMemberFee),
    tierOrder: Number(r.tierOrder || 1),
    createdAt: r.createdAt ? String(r.createdAt) : undefined,
    updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
  }));
}

export async function saveEwaFeeTiers(
  db: Db,
  tiers: Array<{
    id?: string;
    minAmount: number;
    maxAmount?: number | null;
    memberFee: number;
    nonMemberFee: number;
    tierOrder?: number;
  }>
): Promise<EwaFeeTier[]> {
  await db.transaction(async () => {
    // Delete existing
    await db.run("DELETE FROM ewa_fee_tiers");

    // Insert new
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      const id = t.id || crypto.randomUUID();
      const order = t.tierOrder ?? (i + 1);
      const minAmount = Math.max(0, Number(t.minAmount || 0));
      const maxAmount = t.maxAmount != null ? Number(t.maxAmount) : null;
      const memberFee = Math.max(0, Number(t.memberFee || 0));
      const nonMemberFee = Math.max(0, Number(t.nonMemberFee || 0));

      await db.query(
        `INSERT INTO ewa_fee_tiers (id, min_amount, max_amount, member_fee, non_member_fee, tier_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`
      ).run(id, minAmount, maxAmount, memberFee, nonMemberFee, order);
    }
  })();

  return getEwaFeeTiers(db);
}

import { calculateEwaFeeFromTiers } from "../lib/calculations";

export async function calculateEwaFee(
  db: Db,
  requestedAmount: number,
  isMember: boolean
): Promise<{ feeAmount: number; feePercentage: number; tier: EwaFeeTier | null }> {
  const tiers = await getEwaFeeTiers(db);
  return calculateEwaFeeFromTiers(
    tiers,
    requestedAmount,
    isMember,
    EWA_MEMBER_FEE_PCT,
    EWA_NON_MEMBER_FEE_PCT
  );
}

export function getEwaPayrollCutoffDay(): number {
  const envVal =
    process.env.EWA_PAYROLL_CUTOFF_DAY ||
    (typeof Bun !== "undefined" ? Bun.env.EWA_PAYROLL_CUTOFF_DAY : undefined) ||
    process.env.VITE_EWA_PAYROLL_CUTOFF_DAY ||
    (typeof Bun !== "undefined" ? Bun.env.VITE_EWA_PAYROLL_CUTOFF_DAY : undefined);

  if (envVal !== undefined && envVal !== "") {
    const parsed = parseInt(String(envVal), 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
      return parsed;
    }
  }

  const startEnvVal =
    process.env.EWA_CYCLE_START_DAY ||
    (typeof Bun !== "undefined" ? Bun.env.EWA_CYCLE_START_DAY : undefined) ||
    process.env.VITE_EWA_CYCLE_START_DAY ||
    (typeof Bun !== "undefined" ? Bun.env.VITE_EWA_CYCLE_START_DAY : undefined);

  if (startEnvVal !== undefined && startEnvVal !== "") {
    const parsed = parseInt(String(startEnvVal), 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
      return parsed === 1 ? 31 : parsed - 1;
    }
  }

  return 25; // Default: 25th is the cutoff day
}

export function getCurrentPeriodMonth(asOfDate?: Date | string): string {
  const target = asOfDate ? new Date(asOfDate) : new Date();
  const year = target.getFullYear();
  const month = target.getMonth() + 1;
  const day = target.getDate();
  const cutoff = getEwaPayrollCutoffDay();

  let pYear = year;
  let pMonth = month;

  if (cutoff > 0 && cutoff < 31 && day > cutoff) {
    pMonth += 1;
    if (pMonth > 12) {
      pMonth = 1;
      pYear += 1;
    }
  }

  return `${pYear}-${String(pMonth).padStart(2, "0")}`;
}

export function getPayrollCycleDates(periodMonth: string, cutoffDay: number = getEwaPayrollCutoffDay()) {
  const [yearStr, monthStr] = periodMonth.split("-");
  const pYear = parseInt(yearStr, 10);
  const pMonth = parseInt(monthStr, 10);

  let startYear = pYear;
  let startMonth = pMonth - 1;
  if (startMonth < 1) {
    startMonth = 12;
    startYear -= 1;
  }

  const startDay = cutoffDay === 31 ? 1 : cutoffDay + 1;
  const endDay = cutoffDay;

  const maxDaysInStartMonth = new Date(startYear, startMonth, 0).getDate();
  const actualStartDay = Math.min(startDay, maxDaysInStartMonth);

  const maxDaysInEndMonth = new Date(pYear, pMonth, 0).getDate();
  const actualEndDay = Math.min(endDay, maxDaysInEndMonth);

  const startDate = new Date(Date.UTC(startYear, startMonth - 1, actualStartDay));
  const endDate = new Date(Date.UTC(pYear, pMonth - 1, actualEndDay));

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDaysInCycle = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;

  return {
    cycleStartDateStr: startDate.toISOString().slice(0, 10),
    cycleEndDateStr: endDate.toISOString().slice(0, 10),
    startDate,
    endDate,
    totalDaysInCycle,
  };
}

export async function syncEmployeeMemberStatus(db: Db, employeeId: string): Promise<void> {
  const emp = await db
    .query("SELECT id, email, nik FROM employees WHERE id = ?")
    .get<{ id: string; email: string; nik?: string | null }>(employeeId);
  if (!emp) return;

  // Check if email or NIK matches an active member
  const member = await db
    .query(
      `SELECT id FROM members 
       WHERE deletedAt IS NULL AND status = 'Aktif' 
       AND (LOWER(email) = LOWER(?) OR (nik IS NOT NULL AND nik != '' AND nik = ?))
       LIMIT 1`
    )
    .get<{ id: string }>(emp.email, emp.nik || "");

  if (member) {
    await db
      .query("UPDATE employees SET member_id = ?, is_member = true, updated_at = NOW() WHERE id = ?")
      .run(member.id, emp.id);
  } else {
    await db
      .query("UPDATE employees SET member_id = NULL, is_member = false, updated_at = NOW() WHERE id = ?")
      .run(emp.id);
  }
}

export function isContractExpired(contractEndDate?: string | null): boolean {
  if (!contractEndDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  const end = String(contractEndDate).slice(0, 10);
  return today > end;
}

export async function getEmployeeByEmail(db: Db, email: string): Promise<CompanyEmployee | null> {
  const normEmail = email.trim().toLowerCase();
  const row = await db
    .query(
      `SELECT 
        id, nip, nik, name, email, phone, department, position,
        base_salary as "baseSalary", member_id as "memberId", is_member as "isMember",
        bank_name as "bankName", bank_account_number as "bankAccountNumber", bank_account_holder as "bankAccountName",
        status, contract_end_date as "contractEndDate", created_at as "createdAt", updated_at as "updatedAt"
       FROM employees 
       WHERE LOWER(email) = ? AND LOWER(status) = 'active' LIMIT 1`
    )
    .get<any>(normEmail);

  if (!row) return null;

  // Auto-sync member status
  await syncEmployeeMemberStatus(db, row.id);

  // Re-fetch synchronized record
  const synced = await db
    .query(
      `SELECT 
        id, nip, nik, name, email, phone, department, position,
        base_salary as "baseSalary", member_id as "memberId", is_member as "isMember",
        bank_name as "bankName", bank_account_number as "bankAccountNumber", bank_account_holder as "bankAccountName",
        status, contract_end_date as "contractEndDate", created_at as "createdAt", updated_at as "updatedAt"
       FROM employees 
       WHERE id = ? LIMIT 1`
    )
    .get<any>(row.id);

  return {
    ...synced,
    baseSalary: Number(synced.baseSalary || 0),
    isMember: Boolean(synced.isMember),
  };
}

export async function getEmployeeById(db: Db, employeeId: string): Promise<CompanyEmployee | null> {
  await syncEmployeeMemberStatus(db, employeeId);
  const row = await db
    .query(
      `SELECT 
        id, nip, nik, name, email, phone, department, position,
        base_salary as "baseSalary", member_id as "memberId", is_member as "isMember",
        bank_name as "bankName", bank_account_number as "bankAccountNumber", bank_account_holder as "bankAccountName",
        status, contract_end_date as "contractEndDate", created_at as "createdAt", updated_at as "updatedAt"
       FROM employees 
       WHERE id = ? LIMIT 1`
    )
    .get<any>(employeeId);

  if (!row) return null;
  return {
    ...row,
    baseSalary: Number(row.baseSalary || 0),
    isMember: Boolean(row.isMember),
  };
}

export async function getMemberActiveMonthlyLoanInstallment(
  db: Db,
  memberId?: string | null,
  periodMonth?: string
): Promise<number> {
  if (!memberId) return 0;
  const period = periodMonth || getCurrentPeriodMonth();

  // 1. Check from loan_schedules for active loans ('Disetujui')
  // Match only the schedule due in this specific period month (1 month installment)
  const schedRes = await db
    .query(
      `SELECT COALESCE(SUM(ls.principalAmount + ls.interestAmount - ls.paidAmount), 0) as total
       FROM loan_schedules ls
       JOIN loans l ON ls.loanId = l.id
       WHERE l.memberId = ? 
         AND l.status = 'Disetujui'
         AND ls.status IN ('Pending', 'Late')
         AND TO_CHAR(ls.dueDate, 'YYYY-MM') = ?`
    )
    .get<{ total: string | number }>(memberId, period);

  const schedTotal = Number(schedRes?.total || 0);
  if (schedTotal > 0) return schedTotal;

  // 2. Fallback: if no schedule rows exist for approved loan, calculate monthly payment from loan terms
  const loans = await db
    .query(
      `SELECT id, amount, tenor, interestRate
       FROM loans
       WHERE memberId = ? AND status = 'Disetujui'`
    )
    .all<{ id: string; amount: number; tenor: number; interestRate?: number }>(memberId);

  let fallbackTotal = 0;
  for (const l of loans) {
    const countRes = await db
      .query(`SELECT COUNT(*) as count FROM loan_schedules WHERE loanId = ?`)
      .get<{ count: string | number }>(l.id);
    if (Number(countRes?.count || 0) === 0) {
      const p = Number(l.amount || 0);
      const t = Number(l.tenor || 1);
      const r = Number(l.interestRate || 0) / 100;
      const monthly = Math.round(p / t + p * r);
      fallbackTotal += monthly;
    }
  }

  return fallbackTotal;
}

export async function getEmployeeEwaQuota(
  db: Db,
  employeeId: string,
  periodMonth?: string,
  asOfDate?: Date | string
): Promise<EwaQuotaInfo> {
  const emp = await getEmployeeById(db, employeeId);
  if (!emp) {
    throw new ServiceError("Data karyawan tidak ditemukan", 404);
  }

  const cutoffDay = getEwaPayrollCutoffDay();
  const period = periodMonth || getCurrentPeriodMonth(asOfDate);
  const coopLoanDeduction = await getMemberActiveMonthlyLoanInstallment(db, emp.memberId, period);
  const effectiveSalary = Math.max(0, emp.baseSalary - coopLoanDeduction);
  const maxMonthlyLimit = Math.floor((effectiveSalary * EWA_MAX_PERCENTAGE) / 100);

  // Progressive daily accrual calculation based on payroll cycle
  const { cycleStartDateStr, cycleEndDateStr, startDate, endDate, totalDaysInCycle } = getPayrollCycleDates(period, cutoffDay);

  const targetDate = asOfDate ? new Date(asOfDate) : new Date();
  const targetUtc = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;

  const clampedTargetTime = Math.min(endDate.getTime(), Math.max(startDate.getTime(), targetUtc));
  const currentDayInCycle = Math.round((clampedTargetTime - startDate.getTime()) / msPerDay) + 1;

  const progressiveRatio = Math.min(1, Math.max(0, currentDayInCycle / totalDaysInCycle));
  const progressivePercentage = Math.round(progressiveRatio * 10000) / 100;
  const dailyAccumulatedLimit = Math.floor(maxMonthlyLimit * progressiveRatio);

  // Sum used advances in this period (pending_transfer, transferred, PENDING, APPROVED, DISBURSED)
  const usedRes = await db
    .query(
      `SELECT COALESCE(SUM(amount), 0) as used
       FROM withdrawal_requests
       WHERE employee_id = ? 
         AND (period_month = ? OR (pay_period_start <= ?::date AND pay_period_end >= ?::date))
         AND status IN ('pending_transfer', 'transferred', 'PENDING', 'APPROVED', 'DISBURSED')`
    )
    .get<{ used: string | number }>(employeeId, period, period + "-15", period + "-15");

  const totalUsedThisMonth = Number(usedRes?.used || 0);
  const remainingQuota = Math.max(0, dailyAccumulatedLimit - totalUsedThisMonth);
  const feePercentage = emp.isMember ? EWA_MEMBER_FEE_PCT : EWA_NON_MEMBER_FEE_PCT;

  const isExpired = isContractExpired(emp.contractEndDate);
  const isZeroEffective = effectiveSalary <= 0;
  const isStatusActive = String(emp.status || "").toLowerCase() === "active";
  const isEligible = !isExpired && !isZeroEffective && isStatusActive;
  const ineligibilityReason = isExpired
    ? `Masa kontrak kerja telah berakhir pada ${String(emp.contractEndDate).slice(0, 10)}. Pengajuan EWA tidak dapat diproses.`
    : isZeroEffective
    ? `Gaji bersih setelah dipotong angsuran pinjaman koperasi (Rp ${coopLoanDeduction.toLocaleString('id-ID')}) adalah Rp 0, sehingga kuota EWA tidak tersedia.`
    : !isStatusActive
    ? 'Status karyawan tidak aktif.'
    : null;

  return {
    employeeId: emp.id,
    employeeName: emp.name,
    isMember: emp.isMember,
    periodMonth: period,
    baseSalary: emp.baseSalary,
    coopLoanDeduction,
    effectiveSalary,
    maxAllowedPercentage: EWA_MAX_PERCENTAGE,
    maxMonthlyLimit,
    currentDay: targetDate.getDate(),
    currentDayInCycle,
    totalDaysInCycle,
    cycleStartDate: cycleStartDateStr,
    cycleEndDate: cycleEndDateStr,
    cutoffDay,
    progressivePercentage,
    dailyAccumulatedLimit,
    totalUsedThisMonth,
    remainingQuota: isEligible ? remainingQuota : 0,
    feePercentage,
    isEligible,
    ineligibilityReason,
    contractEndDate: emp.contractEndDate ? String(emp.contractEndDate).slice(0, 10) : null,
  };
}

export async function createEwaRequest(
  db: Db,
  employeeId: string,
  input: {
    amount: number;
    destinationBank?: string;
    destinationAccount?: string;
    destinationName?: string;
  }
): Promise<EWARequest> {
  const emp = await getEmployeeById(db, employeeId);
  if (!emp) {
    throw new ServiceError("Data karyawan tidak ditemukan", 404);
  }

  if (isContractExpired(emp.contractEndDate)) {
    throw new ServiceError(
      `Pengajuan EWA gagal: masa kontrak kerja telah berakhir pada ${String(emp.contractEndDate).slice(0, 10)}.`,
      400
    );
  }

  const quota = await getEmployeeEwaQuota(db, employeeId);
  const requestedAmount = Math.round(Number(input.amount));

  if (!quota.isEligible) {
    throw new ServiceError(quota.ineligibilityReason || "Karyawan tidak memenuhi syarat pengajuan EWA", 400);
  }

  if (requestedAmount <= 0) {
    throw new ServiceError("Nominal penarikan harus lebih dari 0", 400);
  }

  if (requestedAmount > quota.remainingQuota) {
    throw new ServiceError(
      `Nominal penarikan (Rp ${requestedAmount.toLocaleString("id-ID")}) melebihi sisa kuota bulan ini (Rp ${quota.remainingQuota.toLocaleString("id-ID")})`,
      400
    );
  }

  const destBank = input.destinationBank || emp?.bankName || "Bank Mandiri";
  const destAcc = input.destinationAccount || emp?.bankAccountNumber || "-";
  const destName = input.destinationName || emp?.bankAccountName || emp?.name || "-";

  const feeCalc = await calculateEwaFee(db, requestedAmount, emp.isMember);
  const feePercentage = feeCalc.feePercentage;
  const feeAmount = feeCalc.feeAmount;
  const totalPayrollDeduction = requestedAmount + feeAmount;

  const periodMonth = quota.periodMonth;
  const startDate = quota.cycleStartDate;
  const endDate = quota.cycleEndDate;

  const res = await db.query(
    `INSERT INTO withdrawal_requests (
      employee_id, employer_id, amount, fee, status,
      pay_period_start, pay_period_end, period_month,
      salary_basis, max_limit, fee_percentage, total_payroll_deduction,
      destination_bank_name, destination_account_number, destination_account_holder,
      requested_at, created_at, updated_at
    ) VALUES (?, 1, ?, ?, 'pending_transfer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW()) RETURNING id`
  ).all(
    employeeId,
    requestedAmount,
    feeAmount,
    startDate,
    endDate,
    periodMonth,
    quota.effectiveSalary ?? quota.baseSalary,
    quota.maxMonthlyLimit,
    feePercentage,
    totalPayrollDeduction,
    destBank,
    destAcc,
    destName
  );

  const insertedId = (res as any[])[0]?.id;
  return (await getEwaRequestById(db, String(insertedId)))!;
}

export async function disburseEwa(
  db: Db,
  requestId: string,
  adminId?: string,
  paymentSourceAccountId?: string
): Promise<EWARequest> {
  return await db.transaction(async () => {
    const req = await db
      .query(
        `SELECT r.*, e.name as employee_name, e.nip as employee_nip 
         FROM withdrawal_requests r 
         JOIN employees e ON r.employee_id = e.id 
         WHERE r.id = ? FOR UPDATE`
      )
      .get<any>(requestId);

    if (!req) {
      throw new ServiceError("Permohonan EWA tidak ditemukan", 404);
    }

    const s = String(req.status || "").toLowerCase();
    if (s !== "pending_transfer" && s !== "pending" && s !== "approved") {
      throw new ServiceError(`Tidak dapat mencairkan EWA dengan status ${req.status}`, 400);
    }

    // 1. Determine Accounts for Auto-Journal
    // Dr. 11301 Piutang Potong Gaji (Payroll) = total_payroll_deduction
    // Cr. 11101 Kas Kecil = disbursed_amount
    // Cr. 41103 Pendapatan Administrasi EWA = fee_amount
    let sourceAccountId = paymentSourceAccountId;
    if (!sourceAccountId) {
      const kasAcc = await db.query("SELECT id FROM accounts WHERE code = '11101' LIMIT 1").get<{ id: string }>();
      sourceAccountId = kasAcc?.id;
    }

    const payrollReceivableAcc = await db
      .query("SELECT id FROM accounts WHERE code = '11301' LIMIT 1")
      .get<{ id: string }>();
    const ewaRevenueAcc = await db
      .query("SELECT id FROM accounts WHERE code = '41103' LIMIT 1")
      .get<{ id: string }>();

    let journalEntryId: string | null = null;

    // Verify valid admin ID for withdrawal_requests.disbursed_by (matching UUID or email)
    let validAdminId: string | null = null;
    if (adminId) {
      const adminRow = await db
        .query("SELECT id FROM admins WHERE id = ? OR LOWER(email) = LOWER(?)")
        .get<{ id: string }>(adminId, adminId);
      if (adminRow?.id) {
        validAdminId = adminRow.id;
      }
    }

    const disbursed = Number(req.amount || req.disbursed_amount || 0);
    const fee = Number(req.fee || req.fee_amount || 0);
    const totalDeduction = Number(req.total_payroll_deduction || (disbursed + fee));

    if (sourceAccountId && payrollReceivableAcc?.id) {
      journalEntryId = crypto.randomUUID();
      const today = getLocalTodayYmd();

      // Auto-journal is recorded by System (created_by: NULL) consistent with other auto-journals
      await db.query(
        `INSERT INTO journal_entries (id, transaction_date, description, reference_type, reference_id, created_by, created_at)
         VALUES (?, ?, ?, 'ewa_disbursement', ?, NULL, NOW())`
      ).run(
        journalEntryId,
        today,
        `Pencairan EWA Kasbon Karyawan: ${req.employee_name} (${req.employee_nip})`,
        requestId
      );

      // Dr. Piutang Potong Gaji
      await db.query(
        `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, description)
         VALUES (?, ?, ?, ?, 0, ?)`
      ).run(
        crypto.randomUUID(),
        journalEntryId,
        payrollReceivableAcc.id,
        totalDeduction,
        `Piutang Payroll EWA ${req.employee_name}`
      );

      // Cr. Kas/Bank
      await db.query(
        `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, description)
         VALUES (?, ?, ?, 0, ?, ?)`
      ).run(
        crypto.randomUUID(),
        journalEntryId,
        sourceAccountId,
        disbursed,
        `Transfer Pencairan EWA ke ${req.destination_bank_name || req.destination_bank} ${req.destination_account_number || req.destination_account}`
      );

      // Cr. Pendapatan Administrasi EWA (if fee > 0 and account exists)
      if (fee > 0 && ewaRevenueAcc?.id) {
        await db.query(
          `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, description)
           VALUES (?, ?, ?, 0, ?, ?)`
        ).run(
          crypto.randomUUID(),
          journalEntryId,
          ewaRevenueAcc.id,
          fee,
          `Fee Layanan EWA ${req.employee_name}`
        );
      }
    }

    // 2. Update withdrawal request status
    await db.query(
      `UPDATE withdrawal_requests 
       SET status = 'transferred', transferred_at = NOW(), disbursed_by = ?, journal_entry_id = ?, updated_at = NOW() 
       WHERE id = ?`
    ).run(validAdminId, journalEntryId, requestId);

    return (await getEwaRequestById(db, requestId))!;
  })();
}

export async function rejectEwa(db: Db, requestId: string, adminId?: string, reason?: string): Promise<EWARequest> {
  return await db.transaction(async () => {
    const req = await db.query("SELECT id, status FROM withdrawal_requests WHERE id = ? FOR UPDATE").get<{ id: string; status: string }>(requestId);
    if (!req) throw new ServiceError("Permohonan EWA tidak ditemukan", 404);
    const s = String(req.status || "").toLowerCase();
    if (s !== "pending_transfer" && s !== "pending" && s !== "approved") {
      throw new ServiceError(`Tidak dapat menolak EWA dengan status ${req.status}`, 400);
    }

    await db.query(
      `UPDATE withdrawal_requests SET status = 'rejected', rejected_at = NOW(), rejection_reason = ?, updated_at = NOW() WHERE id = ?`
    ).run(reason || 'Ditolak oleh admin', requestId);

    return (await getEwaRequestById(db, requestId))!;
  })();
}

export async function getEwaRequestById(db: Db, id: string): Promise<EWARequest | null> {
  const row = await db
    .query(
      `SELECT 
        r.id, r.employee_id as "employeeId", e.name as "employeeName", e.nip as "employeeNip",
        CASE WHEN m.id IS NOT NULL THEN true ELSE COALESCE(e.is_member, false) END as "isMember",
        r.period_month as "periodMonth",
        COALESCE(r.salary_basis, e.base_salary) as "salaryBasis",
        COALESCE(r.max_limit, e.withdrawal_limit) as "maxLimit",
        r.amount as "amountRequested",
        COALESCE(
          r.fee_percentage,
          CASE WHEN r.amount > 0 THEN ROUND((r.fee::numeric / r.amount::numeric) * 100, 2) ELSE 0 END
        ) as "feePercentage",
        r.fee as "feeAmount",
        r.amount as "disbursedAmount",
        COALESCE(r.total_payroll_deduction, r.amount + r.fee) as "totalPayrollDeduction",
        COALESCE(r.destination_bank_name, '') as "destinationBank",
        COALESCE(r.destination_account_number, '') as "destinationAccount",
        COALESCE(r.destination_account_holder, '') as "destinationName",
        CASE 
          WHEN r.status = 'transferred' THEN 'DISBURSED'
          WHEN r.status = 'rejected' THEN 'REJECTED'
          WHEN r.status = 'settled' THEN 'PAID_SETTLED'
          WHEN r.status = 'pending_transfer' THEN 'PENDING'
          ELSE UPPER(r.status)
        END as status,
        r.rejection_reason as "rejectionReason",
        r.transferred_at as "disbursedAt",
        r.disbursed_by as "disbursedBy",
        COALESCE(NULLIF(TRIM(a.name), ''), a.email) as "disbursedByName",
        r.settled_at as "settledAt",
        r.created_at as "createdAt"
       FROM withdrawal_requests r
       JOIN employees e ON r.employee_id = e.id
       LEFT JOIN members m ON (
         m.id = e.member_id 
         OR (m.nik IS NOT NULL AND m.nik != '' AND e.nik IS NOT NULL AND e.nik != '' AND m.nik = e.nik)
         OR (m.email IS NOT NULL AND m.email != '' AND e.email IS NOT NULL AND e.email != '' AND LOWER(m.email) = LOWER(e.email))
       ) AND m.deletedAt IS NULL AND m.status = 'Aktif'
       LEFT JOIN admins a ON r.disbursed_by = a.id
       WHERE r.id = ?`
    )
    .get<any>(id);

  if (!row) return null;
  return {
    ...row,
    salaryBasis: Number(row.salaryBasis || 0),
    maxLimit: Number(row.maxLimit || 0),
    amountRequested: Number(row.amountRequested || 0),
    feePercentage: Number(row.feePercentage || 0),
    feeAmount: Number(row.feeAmount || 0),
    disbursedAmount: Number(row.disbursedAmount || 0),
    totalPayrollDeduction: Number(row.totalPayrollDeduction || 0),
  };
}

export async function getEwaRequestsList(
  db: Db,
  options: {
    employeeId?: string;
    periodMonth?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ data: EWARequest[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (options.employeeId) {
    conditions.push("r.employee_id = ?");
    params.push(options.employeeId);
  }
  if (options.periodMonth) {
    conditions.push("(r.period_month = ? OR (r.pay_period_start <= ?::date AND r.pay_period_end >= ?::date))");
    params.push(options.periodMonth, options.periodMonth + "-15", options.periodMonth + "-15");
  }
  if (options.status) {
    const s = options.status.toLowerCase();
    if (s === "pending") conditions.push("r.status IN ('pending_transfer', 'PENDING')");
    else if (s === "disbursed") conditions.push("r.status IN ('transferred', 'DISBURSED')");
    else if (s === "rejected") conditions.push("r.status IN ('rejected', 'REJECTED')");
    else if (s === "paid_settled") conditions.push("r.status IN ('settled', 'PAID_SETTLED')");
    else {
      conditions.push("LOWER(r.status) = ?");
      params.push(s);
    }
  }
  if (options.search && options.search.trim()) {
    conditions.push("(e.name ILIKE ? OR e.nip ILIKE ?)");
    const term = `%${options.search.trim()}%`;
    params.push(term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const totalRes = await db
    .query(`SELECT COUNT(*) as count FROM withdrawal_requests r JOIN employees e ON r.employee_id = e.id ${whereClause}`)
    .get<any>(...params);
  const total = Number(totalRes?.count || 0);

  const rows = await db
    .query(
      `SELECT 
        r.id, r.employee_id as "employeeId", e.name as "employeeName", e.nip as "employeeNip",
        CASE WHEN m.id IS NOT NULL THEN true ELSE COALESCE(e.is_member, false) END as "isMember",
        r.period_month as "periodMonth", 
        COALESCE(r.salary_basis, e.base_salary) as "salaryBasis",
        COALESCE(r.max_limit, e.withdrawal_limit) as "maxLimit", 
        r.amount as "amountRequested", 
        COALESCE(
          r.fee_percentage,
          CASE WHEN r.amount > 0 THEN ROUND((r.fee::numeric / r.amount::numeric) * 100, 2) ELSE 0 END
        ) as "feePercentage",
        r.fee as "feeAmount", 
        r.amount as "disbursedAmount", 
        COALESCE(r.total_payroll_deduction, r.amount + r.fee) as "totalPayrollDeduction",
        COALESCE(r.destination_bank_name, '') as "destinationBank", 
        COALESCE(r.destination_account_number, '') as "destinationAccount", 
        COALESCE(r.destination_account_holder, '') as "destinationName",
        CASE 
          WHEN r.status = 'transferred' THEN 'DISBURSED'
          WHEN r.status = 'rejected' THEN 'REJECTED'
          WHEN r.status = 'settled' THEN 'PAID_SETTLED'
          WHEN r.status = 'pending_transfer' THEN 'PENDING'
          ELSE UPPER(r.status)
        END as status, 
        r.rejection_reason as "rejectionReason", 
        r.transferred_at as "disbursedAt", 
        r.disbursed_by as "disbursedBy",
        COALESCE(NULLIF(TRIM(a.name), ''), a.email) as "disbursedByName",
        r.settled_at as "settledAt", 
        r.created_at as "createdAt"
       FROM withdrawal_requests r
       JOIN employees e ON r.employee_id = e.id
       LEFT JOIN members m ON (
         m.id = e.member_id 
         OR (m.nik IS NOT NULL AND m.nik != '' AND e.nik IS NOT NULL AND e.nik != '' AND m.nik = e.nik)
         OR (m.email IS NOT NULL AND m.email != '' AND e.email IS NOT NULL AND e.email != '' AND LOWER(m.email) = LOWER(e.email))
       ) AND m.deletedAt IS NULL AND m.status = 'Aktif'
       LEFT JOIN admins a ON r.disbursed_by = a.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  return {
    data: rows.map((r: any) => ({
      ...r,
      salaryBasis: Number(r.salaryBasis || 0),
      maxLimit: Number(r.maxLimit || 0),
      amountRequested: Number(r.amountRequested || 0),
      feePercentage: Number(r.feePercentage || 0),
      feeAmount: Number(r.feeAmount || 0),
      disbursedAmount: Number(r.disbursedAmount || 0),
      totalPayrollDeduction: Number(r.totalPayrollDeduction || 0),
    })),
    total,
    page,
    limit,
  };
}

export async function getPayrollRecap(
  db: Db,
  periodMonth: string
): Promise<{
  periodMonth: string;
  totalEmployees: number;
  totalDisbursed: number;
  totalFee: number;
  totalDeduction: number;
  isFullySettled: boolean;
  items: Array<{
    employeeId: string;
    nip: string;
    nik?: string | null;
    name: string;
    department?: string | null;
    isMember: boolean;
    txCount?: number;
    totalAdvances: number;
    totalFee: number;
    totalDeduction: number;
    status: string;
  }>;
}> {
  const rows = await db
    .query(
      `SELECT 
        e.id as "employeeId", e.nip, e.nik, e.name, e.department,
        CASE WHEN m.id IS NOT NULL THEN true ELSE COALESCE(e.is_member, false) END as "isMember",
        COUNT(r.id) as "txCount",
        SUM(r.amount) as "totalAdvances",
        SUM(r.fee) as "totalFee",
        SUM(COALESCE(r.total_payroll_deduction, r.amount + r.fee)) as "totalDeduction",
        MIN(CASE WHEN r.status = 'transferred' THEN 'DISBURSED' WHEN r.status = 'settled' THEN 'PAID_SETTLED' ELSE UPPER(r.status) END) as "status"
       FROM withdrawal_requests r
       JOIN employees e ON r.employee_id = e.id
       LEFT JOIN members m ON (
         m.id = e.member_id 
         OR (m.nik IS NOT NULL AND m.nik != '' AND e.nik IS NOT NULL AND e.nik != '' AND m.nik = e.nik)
         OR (m.email IS NOT NULL AND m.email != '' AND e.email IS NOT NULL AND e.email != '' AND LOWER(m.email) = LOWER(e.email))
       ) AND m.deletedAt IS NULL AND m.status = 'Aktif'
       WHERE (r.period_month = ? OR (r.pay_period_start <= ?::date AND r.pay_period_end >= ?::date)) 
         AND r.status IN ('transferred', 'DISBURSED', 'settled', 'PAID_SETTLED')
       GROUP BY e.id, e.nip, e.nik, e.name, e.department, e.is_member, m.id
       ORDER BY e.name ASC`
    )
    .all(periodMonth, periodMonth + "-15", periodMonth + "-15");

  const items = rows.map((r: any) => ({
    employeeId: r.employeeId,
    nip: r.nip,
    nik: r.nik || null,
    name: r.name,
    department: r.department,
    isMember: Boolean(r.isMember),
    txCount: Number(r.txCount || 1),
    totalAdvances: Number(r.totalAdvances || 0),
    totalFee: Number(r.totalFee || 0),
    totalDeduction: Number(r.totalDeduction || 0),
    status: r.status,
  }));

  const totalEmployees = items.length;
  const totalDisbursed = items.reduce((sum, item) => sum + item.totalAdvances, 0);
  const totalFee = items.reduce((sum, item) => sum + item.totalFee, 0);
  const totalDeduction = items.reduce((sum, item) => sum + item.totalDeduction, 0);

  const unsettledCount = await db
    .query(
      `SELECT COUNT(*) as count FROM withdrawal_requests 
       WHERE (period_month = ? OR (pay_period_start <= ?::date AND pay_period_end >= ?::date)) 
         AND status IN ('transferred', 'DISBURSED')`
    )
    .get<any>(periodMonth, periodMonth + "-15", periodMonth + "-15");

  const isFullySettled = Number(unsettledCount?.count || 0) === 0 && totalEmployees > 0;

  return {
    periodMonth,
    totalEmployees,
    totalDisbursed,
    totalFee,
    totalDeduction,
    isFullySettled,
    items,
  };
}

export async function settlePayroll(
  db: Db,
  periodMonth: string,
  adminId?: string,
  targetAccountId?: string,
  transactionDate?: string
): Promise<{ settledCount: number; totalSettledAmount: number }> {
  const recap = await getPayrollRecap(db, periodMonth);
  if (recap.totalEmployees === 0) {
    throw new ServiceError(`Tidak ada potongan EWA untuk periode ${periodMonth}`, 400);
  }

  // Find target cash/bank account for receiving payroll payment from parent company
  let bankAccountId = targetAccountId;
  if (!bankAccountId) {
    const bankAcc = await db.query("SELECT id FROM accounts WHERE code = '11102' LIMIT 1").get<{ id: string }>();
    bankAccountId = bankAcc?.id;
  }
  const payrollReceivableAcc = await db
    .query("SELECT id FROM accounts WHERE code = '11301' LIMIT 1")
    .get<{ id: string }>();

  let journalEntryId: string | null = null;
  const totalAmount = recap.totalDeduction;

  if (bankAccountId && payrollReceivableAcc?.id && totalAmount > 0) {
    journalEntryId = crypto.randomUUID();
    const effectiveDate = transactionDate || getLocalTodayYmd();

    // Auto-journal is recorded by System (created_by: NULL) consistent with other auto-journals
    await db.query(
      `INSERT INTO journal_entries (id, transaction_date, description, reference_type, reference_id, created_by, created_at)
       VALUES (?, ?, ?, 'ewa_payroll_settlement', ?, NULL, NOW())`
    ).run(
      journalEntryId,
      effectiveDate,
      `Pelunasan Payroll Potong Gaji EWA Periode ${periodMonth} (${recap.totalEmployees} Karyawan)`,
      periodMonth
    );

    // Dr. Kas / Bank (penerimaan uang pelunasan dari holding company)
    await db.query(
      `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, description)
       VALUES (?, ?, ?, ?, 0, ?)`
    ).run(
      crypto.randomUUID(),
      journalEntryId,
      bankAccountId,
      totalAmount,
      `Penerimaan Pelunasan Payroll EWA Periode ${periodMonth}`
    );

    // Cr. Piutang Potong Gaji (Payroll)
    await db.query(
      `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, description)
       VALUES (?, ?, ?, 0, ?, ?)`
    ).run(
      crypto.randomUUID(),
      journalEntryId,
      payrollReceivableAcc.id,
      totalAmount,
      `Pelunasan Piutang Payroll EWA Periode ${periodMonth}`
    );
  }

  // Update all transferred/DISBURSED requests in period to settled
  await db.query(
    `UPDATE withdrawal_requests 
     SET status = 'settled', settled_at = NOW(), updated_at = NOW() 
     WHERE (period_month = ? OR (pay_period_start <= ?::date AND pay_period_end >= ?::date)) 
       AND status IN ('transferred', 'DISBURSED')`
  ).run(periodMonth, periodMonth + "-15", periodMonth + "-15");

  return {
    settledCount: recap.totalEmployees,
    totalSettledAmount: totalAmount,
  };
}

/**
 * Resolves and caps the base salary for EWA.
 * If EWA_MAX_BASE_SALARY environment variable is set (e.g. 10000000),
 * base salary will be capped at that value so that very high salaries are not disclosed to cooperative admins.
 */
export function getCappedBaseSalary(salary: number): number {
  const maxEnv =
    process.env.EWA_MAX_BASE_SALARY ||
    (typeof Bun !== "undefined" ? Bun.env.EWA_MAX_BASE_SALARY : undefined) ||
    process.env.VITE_EWA_MAX_BASE_SALARY ||
    (typeof Bun !== "undefined" ? Bun.env.VITE_EWA_MAX_BASE_SALARY : undefined);

  const numSalary = Math.max(0, Number(salary) || 0);
  if (maxEnv) {
    const cap = parseFloat(maxEnv);
    if (!isNaN(cap) && cap > 0) {
      return Math.min(numSalary, cap);
    }
  }
  return numSalary;
}

export async function batchImportEmployees(
  db: Db,
  items: Array<{
    nip: string;
    nik?: string | null;
    name: string;
    email: string;
    phone?: string | null;
    department?: string | null;
    position?: string | null;
    baseSalary: number;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankAccountName?: string | null;
    contractEndDate?: string | null;
  }>
): Promise<{ processedCount: number; errors: Array<{ index: number; nip: string; message: string }> }> {
  let processedCount = 0;
  const errors: Array<{ index: number; nip: string; message: string }> = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const email = item.email.trim().toLowerCase();
      const nip = item.nip.trim();
      const name = item.name.trim();
      const cappedSalary = getCappedBaseSalary(item.baseSalary);
      const contractEndDate = item.contractEndDate ? item.contractEndDate.trim().slice(0, 10) : null;

      // Check if employee already exists by NIP or email
      const existing = await db
        .query("SELECT id FROM employees WHERE nip = ? OR LOWER(email) = ? LIMIT 1")
        .get<{ id: string | number }>(nip, email);

      if (existing) {
        await db.query(
          `UPDATE employees SET
            nik = ?, name = ?, email = ?, phone = ?, department = ?, position = ?,
            base_salary = ?, withdrawal_limit = ?, bank_name = ?, bank_account_number = ?, bank_account_holder = ?,
            contract_end_date = ?, updated_at = NOW()
           WHERE id = ?`
        ).run(
          item.nik || null,
          name,
          email,
          item.phone || null,
          item.department || null,
          item.position || null,
          cappedSalary,
          cappedSalary,
          item.bankName || null,
          item.bankAccountNumber || null,
          item.bankAccountName || name,
          contractEndDate,
          existing.id
        );
        await syncEmployeeMemberStatus(db, String(existing.id));
      } else {
        const res = await db.query(
          `INSERT INTO employees (
            employer_id, nip, nik, name, email, phone, department, position,
            base_salary, withdrawal_limit, bank_name, bank_account_number, bank_account_holder,
            contract_end_date, status, created_at, updated_at
          ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW()) RETURNING id`
        ).all(
          nip,
          item.nik || null,
          name,
          email,
          item.phone || null,
          item.department || null,
          item.position || null,
          cappedSalary,
          cappedSalary,
          item.bankName || null,
          item.bankAccountNumber || null,
          item.bankAccountName || name,
          contractEndDate
        );
        const newId = (res as any[])[0]?.id;
        if (newId) {
          await syncEmployeeMemberStatus(db, String(newId));
        }
      }
      processedCount++;
    } catch (err: any) {
      errors.push({
        index: i,
        nip: item.nip || `Baris ${i + 1}`,
        message: err.message || "Gagal memproses data karyawan",
      });
    }
  }

  return { processedCount, errors };
}

export async function getEwaPaymentSources(
  database: Db
): Promise<Array<{ id: string; code: string; name: string; type: string }>> {
  return database
    .query(`
      SELECT id, code, name, type 
      FROM accounts 
      WHERE code LIKE '111%'
      ORDER BY code ASC
    `)
    .all<{ id: string; code: string; name: string; type: string }>();
}

export async function getEwaEmployeesList(
  db: Db,
  options: {
    search?: string;
    status?: string;
    limit: number;
    offset: number;
  }
) {
  const { search = '', status = '', limit, offset } = options;
  const conditions: string[] = [];
  const params: any[] = [];

  if (search.trim()) {
    conditions.push('(LOWER(e.name) LIKE ? OR LOWER(e.nip) LIKE ? OR LOWER(e.email) LIKE ?)');
    const q = `%${search.trim().toLowerCase()}%`;
    params.push(q, q, q);
  }
  if (status) {
    conditions.push('LOWER(e.status) = LOWER(?)');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalRes = await db
    .query(`SELECT COUNT(*) as count FROM employees e ${whereClause}`)
    .get<any>(...params);
  const total = Number(totalRes?.count || 0);

  const rows = await db
    .query(
      `SELECT 
        e.id, e.nip, e.nik, e.name, e.email, e.phone, e.department, e.position,
        e.base_salary as "baseSalary", e.member_id as "memberId",
        CASE WHEN m.id IS NOT NULL THEN true ELSE COALESCE(e.is_member, false) END as "isMember",
        e.bank_name as "bankName", e.bank_account_number as "bankAccountNumber", e.bank_account_holder as "bankAccountName",
        e.status, e.contract_end_date as "contractEndDate", e.created_at as "createdAt", e.updated_at as "updatedAt"
       FROM employees e
       LEFT JOIN members m ON (
         m.id = e.member_id 
         OR (m.nik IS NOT NULL AND m.nik != '' AND e.nik IS NOT NULL AND e.nik != '' AND m.nik = e.nik)
         OR (m.email IS NOT NULL AND m.email != '' AND e.email IS NOT NULL AND e.email != '' AND LOWER(m.email) = LOWER(e.email))
       ) AND m.deletedAt IS NULL AND m.status = 'Aktif'
       ${whereClause}
       ORDER BY e.name ASC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  const now = new Date();
  const currentPeriod = getCurrentPeriodMonth(now);
  const cutoffDay = getEwaPayrollCutoffDay();
  const { startDate, endDate, totalDaysInCycle } = getPayrollCycleDates(currentPeriod, cutoffDay);
  const targetUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;
  const clampedTargetTime = Math.min(endDate.getTime(), Math.max(startDate.getTime(), targetUtc));
  const currentDayInCycle = Math.round((clampedTargetTime - startDate.getTime()) / msPerDay) + 1;
  const progressiveRatio = Math.min(1, Math.max(0, currentDayInCycle / totalDaysInCycle));

  const items = await Promise.all(
    rows.map(async (r: any) => {
      const baseSalary = Number(r.baseSalary || 0);
      const coopLoanDeduction = await getMemberActiveMonthlyLoanInstallment(db, r.memberId, currentPeriod);
      const effectiveSalary = Math.max(0, baseSalary - coopLoanDeduction);
      const maxMonthlyLimit = Math.floor(effectiveSalary * 0.5);
      const dailyAccumulatedLimit = Math.floor(maxMonthlyLimit * progressiveRatio);
      return {
        ...r,
        baseSalary,
        coopLoanDeduction,
        effectiveSalary,
        dailyAccumulatedLimit,
        isMember: Boolean(r.isMember),
      };
    })
  );

  return { items, total };
}

