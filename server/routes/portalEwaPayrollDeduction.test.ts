import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { sign } from "hono/jwt";
import server from "../index";
import { secretKey } from "../middleware";
import db from "../db";
import { getCurrentPeriodMonth, getPreviousPeriodMonth } from "../services/ewaService";

describe("Portal EWA Payroll Deduction Summary API (#335, #339)", () => {
  let memberToken: string;
  const testSuffix = Date.now().toString().slice(-6);

  let employeeId: number | string;
  const createdReqIds: Array<number | string> = [];
  const currentPeriod = getCurrentPeriodMonth();
  const previousPeriod = getPreviousPeriodMonth(currentPeriod);
  let prevUnsettledReqId: number | string;

  beforeAll(async () => {
    // 1. Create test employee
    const empRes = await db
      .query(
        `INSERT INTO employees (
          employer_id, name, email, nik, nip, department, position, base_salary,
          status, is_member, bank_name, bank_account_number, bank_account_holder
        ) VALUES (
          1, ?, ?, '1234567890123499', ?, 'Engineering', 'Developer', 10000000,
          'active', true, 'Bank BCA', '9988776655', ?
        ) RETURNING id`
      )
      .get<{ id: number | string }>(
        `Karyawan Portal EWA ${testSuffix}`,
        `emp_portal_${testSuffix}@example.com`,
        `NIP-PORTAL-${testSuffix}`,
        `Karyawan Portal EWA ${testSuffix}`
      );
    employeeId = empRes!.id;

    // 2. Generate member JWT token with employeeId
    memberToken = await sign(
      {
        sub: `mem-portal-${testSuffix}`,
        employeeId: String(employeeId),
        name: `Karyawan Portal EWA ${testSuffix}`,
        role: "member",
        email: `emp_portal_${testSuffix}@example.com`,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      secretKey
    );

    // 3. Insert withdrawal requests:
    // a. Transferred / Disbursed 1: Amount 1.000.000, Fee 25.000, Deduction 1.025.000 (Current Period)
    const r1 = await db
      .query(
        `INSERT INTO withdrawal_requests (
          employer_id, employee_id, amount, status, period_month, pay_period_start, pay_period_end,
          fee, fee_percentage, destination_bank_name, destination_account_number, destination_account_holder,
          transferred_at, total_payroll_deduction
        ) VALUES (
          1, ?, 1000000, 'transferred', ?, '2026-11-26', '2026-12-25',
          25000, 2.5, 'Bank BCA', '9988776655', 'Karyawan',
          NOW(), 1025000
        ) RETURNING id`
      )
      .get<{ id: number | string }>(employeeId, currentPeriod);
    createdReqIds.push(r1!.id);

    // b. Disbursed 2: Amount 500.000, Fee 12.500, Deduction 512.500 (Current Period)
    const r2 = await db
      .query(
        `INSERT INTO withdrawal_requests (
          employer_id, employee_id, amount, status, period_month, pay_period_start, pay_period_end,
          fee, fee_percentage, destination_bank_name, destination_account_number, destination_account_holder,
          transferred_at, total_payroll_deduction
        ) VALUES (
          1, ?, 500000, 'DISBURSED', ?, '2026-11-26', '2026-12-25',
          12500, 2.5, 'Bank BCA', '9988776655', 'Karyawan',
          NOW(), 512500
        ) RETURNING id`
      )
      .get<{ id: number | string }>(employeeId, currentPeriod);
    createdReqIds.push(r2!.id);

    // c. Pending 1: Amount 300.000, Fee 7.500, Deduction 307.500 (Current Period - Still PENDING)
    const r3 = await db
      .query(
        `INSERT INTO withdrawal_requests (
          employer_id, employee_id, amount, status, period_month, pay_period_start, pay_period_end,
          fee, fee_percentage, destination_bank_name, destination_account_number, destination_account_holder,
          total_payroll_deduction
        ) VALUES (
          1, ?, 300000, 'PENDING', ?, '2026-11-26', '2026-12-25',
          7500, 2.5, 'Bank BCA', '9988776655', 'Karyawan',
          307500
        ) RETURNING id`
      )
      .get<{ id: number | string }>(employeeId, currentPeriod);
    createdReqIds.push(r3!.id);

    // d. Rejected: Amount 400.000, Fee 10.000, Deduction 410.000 (Must be EXCLUDED)
    const r4 = await db
      .query(
        `INSERT INTO withdrawal_requests (
          employer_id, employee_id, amount, status, period_month, pay_period_start, pay_period_end,
          fee, fee_percentage, destination_bank_name, destination_account_number, destination_account_holder,
          rejected_at, rejection_reason, total_payroll_deduction
        ) VALUES (
          1, ?, 400000, 'rejected', ?, '2026-11-26', '2026-12-25',
          10000, 2.5, 'Bank BCA', '9988776655', 'Karyawan',
          NOW(), 'Saldo tidak cukup', 410000
        ) RETURNING id`
      )
      .get<{ id: number | string }>(employeeId, currentPeriod);
    createdReqIds.push(r4!.id);

    // e. Previous Period Unsettled: Amount 750.000, Fee 18.750, Deduction 768.750 (Status DISBURSED) (#339)
    const rPrev = await db
      .query(
        `INSERT INTO withdrawal_requests (
          employer_id, employee_id, amount, status, period_month, pay_period_start, pay_period_end,
          fee, fee_percentage, destination_bank_name, destination_account_number, destination_account_holder,
          transferred_at, total_payroll_deduction
        ) VALUES (
          1, ?, 750000, 'transferred', ?, '2026-10-26', '2026-11-25',
          18750, 2.5, 'Bank BCA', '9988776655', 'Karyawan',
          NOW(), 768750
        ) RETURNING id`
      )
      .get<{ id: number | string }>(employeeId, previousPeriod);
    prevUnsettledReqId = rPrev!.id;
    createdReqIds.push(prevUnsettledReqId);

    // f. Past Cycle 2025-01: Amount 2.000.000, Fee 50.000, already settled (Must be EXCLUDED)
    const r5 = await db
      .query(
        `INSERT INTO withdrawal_requests (
          employer_id, employee_id, amount, status, period_month, pay_period_start, pay_period_end,
          fee, fee_percentage, destination_bank_name, destination_account_number, destination_account_holder,
          transferred_at, settled_at, total_payroll_deduction
        ) VALUES (
          1, ?, 2000000, 'PAID_SETTLED', '2025-01', '2024-12-26', '2025-01-25',
          50000, 2.5, 'Bank BCA', '9988776655', 'Karyawan',
          '2025-01-10 10:00:00', '2025-01-28 10:00:00', 2050000
        ) RETURNING id`
      )
      .get<{ id: number | string }>(employeeId);
    createdReqIds.push(r5!.id);
  });

  afterAll(async () => {
    if (createdReqIds.length > 0) {
      await db.run(
        `DELETE FROM withdrawal_requests WHERE id IN (${createdReqIds.map(() => "?").join(",")})`,
        createdReqIds
      );
    }
    if (employeeId) {
      await db.run("DELETE FROM employees WHERE id = ?", [employeeId]);
    }
  });

  test("getPreviousPeriodMonth helper correctly computes previous month and year boundary", () => {
    expect(getPreviousPeriodMonth("2026-12")).toBe("2026-11");
    expect(getPreviousPeriodMonth("2026-01")).toBe("2025-12");
    expect(getPreviousPeriodMonth("2026-10")).toBe("2026-09");
  });

  test("GET /api/v1/portal/ewa/quota returns accurate current cycle payroll deduction aggregation (#335)", async () => {
    const res = await server.fetch(
      new Request("http://localhost/api/v1/portal/ewa/quota", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const quota = json.data;

    // Disbursed principal: 1.000.000 + 500.000 = 1.500.000
    expect(quota.totalDisbursedThisMonth).toBe(1500000);

    // Disbursed fee: 25.000 + 12.500 = 37.500
    expect(quota.totalFeeThisMonth).toBe(37500);

    // Disbursed total payroll deduction (principal + fee): 1.025.000 + 512.500 = 1.537.500
    expect(quota.totalPayrollDeductionThisMonth).toBe(1537500);

    // Pending deduction: 307.500 (only the PENDING request, not mixed into totalPayrollDeductionThisMonth)
    expect(quota.pendingPayrollDeductionThisMonth).toBe(307500);

    // Total used in quota limit calculation includes pending + transferred in current period: 1.000.000 + 500.000 + 300.000 = 1.800.000
    expect(quota.totalUsedThisMonth).toBe(1800000);
  });

  test("GET /api/v1/portal/ewa/quota returns previous cycle unsettled deductions during transition (#339)", async () => {
    const res = await server.fetch(
      new Request("http://localhost/api/v1/portal/ewa/quota", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    const quota = json.data;

    // Previous cycle unsettled deduction info (#339)
    expect(quota.previousUnsettledPayrollDeduction).toBe(768750);
    expect(quota.previousUnsettledDisbursed).toBe(750000);
    expect(quota.previousUnsettledFee).toBe(18750);
    expect(quota.previousPeriodMonth).toBe(previousPeriod);
    expect(quota.previousCycleStartDate).toBeDefined();
    expect(quota.previousCycleEndDate).toBeDefined();

    // Now simulate settling the previous period transaction (PAID_SETTLED)
    await db.run("UPDATE withdrawal_requests SET status = 'PAID_SETTLED', settled_at = NOW() WHERE id = ?", [
      prevUnsettledReqId,
    ]);

    const resAfterSettle = await server.fetch(
      new Request("http://localhost/api/v1/portal/ewa/quota", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      })
    );

    expect(resAfterSettle.status).toBe(200);
    const jsonAfter = await resAfterSettle.json();
    expect(jsonAfter.success).toBe(true);

    // After settlement, previousUnsettledPayrollDeduction automatically resets to 0
    expect(jsonAfter.data.previousUnsettledPayrollDeduction).toBe(0);
    expect(jsonAfter.data.previousUnsettledDisbursed).toBe(0);
    expect(jsonAfter.data.previousUnsettledFee).toBe(0);
  });
});
