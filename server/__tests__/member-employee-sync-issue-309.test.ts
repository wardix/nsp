import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import db from "../db";
import {
  createMember,
  updateMember,
  deleteMember,
  batchImportMembers,
} from "../services/memberService";
import {
  getEwaRequestsList,
  getEwaRequestById,
  getPayrollRecap,
  getEwaEmployeesList,
} from "../services/ewaService";

describe("Sync Member & Employee Cooperative Membership Status (Issue #309)", () => {
  const testNik1 = "3201010101990001";
  const testNik2 = "3201010101990002";
  const testEmail1 = "sync.emp1@example.test";
  const testEmail2 = "sync.emp2@example.test";
  const testEmpId1 = 980001;
  const testEmpId2 = 980002;
  const testEmpId3 = 980003;

  let member1Id: string | null = null;
  let member2Id: string | null = null;

  beforeAll(async () => {
    // Clean up any stale test records
    await db.run("DELETE FROM withdrawal_requests WHERE employee_id IN (?, ?, ?)", [
      testEmpId1,
      testEmpId2,
      testEmpId3,
    ]);
    await db.run("DELETE FROM employees WHERE id IN (?, ?, ?)", [
      testEmpId1,
      testEmpId2,
      testEmpId3,
    ]);
    await db.run("DELETE FROM members WHERE nik IN (?, ?)", [testNik1, testNik2]);

    // Insert dummy company employees (initially non-members)
    await db.run(
      `INSERT INTO employees (
        id, employer_id, name, nip, nik, email, base_salary, status, is_member, created_at, updated_at
      ) VALUES (?, 1, 'Sync Employee One', '0202331', ?, ?, 8000000, 'active', false, NOW(), NOW())`,
      [testEmpId1, testNik1, testEmail1]
    );

    await db.run(
      `INSERT INTO employees (
        id, employer_id, name, nip, nik, email, base_salary, status, is_member, created_at, updated_at
      ) VALUES (?, 1, 'Sync Employee Two', '0201408', ?, ?, 9000000, 'active', false, NOW(), NOW())`,
      [testEmpId2, testNik2, testEmail2]
    );

    await db.run(
      `INSERT INTO employees (
        id, employer_id, name, nip, nik, email, base_salary, status, is_member, created_at, updated_at
      ) VALUES (?, 1, 'Sync Employee Three', '0202402', '3201010101990003', 'sync.emp3@example.test', 7000000, 'active', false, NOW(), NOW())`,
      [testEmpId3]
    );
  });

  afterAll(async () => {
    await db.run("DELETE FROM withdrawal_requests WHERE employee_id IN (?, ?, ?)", [
      testEmpId1,
      testEmpId2,
      testEmpId3,
    ]);
    await db.run("DELETE FROM employees WHERE id IN (?, ?, ?)", [
      testEmpId1,
      testEmpId2,
      testEmpId3,
    ]);
    if (member1Id) await db.run("DELETE FROM members WHERE id = ?", [member1Id]);
    if (member2Id) await db.run("DELETE FROM members WHERE id = ?", [member2Id]);
    await db.run("DELETE FROM members WHERE nik IN (?, ?)", [testNik1, testNik2]);
  });

  test("initial state: employees are not cooperative members", async () => {
    const emp1 = await db
      .query("SELECT id, is_member, member_id FROM employees WHERE id = ?")
      .get<any>(testEmpId1);
    expect(Boolean(emp1?.is_member)).toBe(false);
    expect(emp1?.member_id).toBeNull();
  });

  test("createMember() automatically syncs is_member=true and member_id to employees by NIK/email", async () => {
    const res = await createMember(
      db,
      {
        name: "Sync Employee One",
        role: "Anggota",
        status: "Aktif",
        joinDate: "2026-01-01",
        nik: testNik1,
        phone: "081234567890",
        email: testEmail1,
        simpananPokok: 100000,
        simpananWajib: 50000,
        simpananSukarela: 20000,
      },
      "test-admin"
    );

    member1Id = res.id;
    expect(member1Id).toBeTruthy();

    const emp = await db
      .query("SELECT id, is_member, member_id FROM employees WHERE id = ?")
      .get<any>(testEmpId1);
    expect(Boolean(emp?.is_member)).toBe(true);
    expect(emp?.member_id).toBe(member1Id);
  });

  test("batchImportMembers() automatically syncs employees by NIK/email", async () => {
    const batchRes = await batchImportMembers(
      db,
      [
        {
          name: "Sync Employee Two",
          nik: testNik2,
          email: testEmail2,
          joinDate: "2026-01-01",
          simpananPokok: 100000,
          simpananWajib: 50000,
          simpananSukarela: 0,
        },
      ],
      "test-admin"
    );

    expect(batchRes.processedCount).toBe(1);
    expect(batchRes.failedCount).toBe(0);

    const mem2 = await db
      .query("SELECT id FROM members WHERE nik = ?")
      .get<any>(testNik2);
    member2Id = mem2?.id;
    expect(member2Id).toBeTruthy();

    const emp = await db
      .query("SELECT id, is_member, member_id FROM employees WHERE id = ?")
      .get<any>(testEmpId2);
    expect(Boolean(emp?.is_member)).toBe(true);
    expect(emp?.member_id).toBe(member2Id);
  });

  test("EWA queries return isMember=true in real-time", async () => {
    // 1. getEwaEmployeesList
    const empList = await getEwaEmployeesList(db, {
      search: "Sync Employee One",
      limit: 10,
      offset: 0,
    });
    const foundEmp1 = empList.items.find((it: any) => it.id === String(testEmpId1) || it.nip === "0202331");
    expect(foundEmp1).toBeTruthy();
    expect(foundEmp1?.isMember).toBe(true);

    // 2. Insert dummy withdrawal request for testEmpId1
    const reqInsert = await db
      .query(
        `INSERT INTO withdrawal_requests (
          employee_id, employer_id, amount, fee, status,
          pay_period_start, pay_period_end, period_month,
          salary_basis, max_limit, requested_at, created_at, updated_at
        ) VALUES (?, 1, 1000000, 20000, 'transferred', '2026-10-01', '2026-10-31', '2026-10', 8000000, 4000000, NOW(), NOW(), NOW())
        RETURNING id`
      )
      .get<{ id: string | number }>(testEmpId1);

    const reqId = String(reqInsert?.id);

    // 3. getEwaRequestById
    const req = await getEwaRequestById(db, reqId);
    expect(req).toBeTruthy();
    expect(req?.isMember).toBe(true);

    // 4. getEwaRequestsList
    const requestsList = await getEwaRequestsList(db, {
      employeeId: String(testEmpId1),
      limit: 10,
      offset: 0,
    });
    expect(requestsList.data.length).toBeGreaterThan(0);
    expect(requestsList.data[0].isMember).toBe(true);

    // 5. getPayrollRecap
    const recap = await getPayrollRecap(db, "2026-10");
    const recapItem = recap.items.find((r: any) => r.employeeId === String(testEmpId1) || r.nip === "0202331");
    expect(recapItem).toBeTruthy();
    expect(recapItem?.isMember).toBe(true);

    await db.run("DELETE FROM withdrawal_requests WHERE id = ?", [reqId]);
  });

  test("updateMember status to 'Nonaktif' unlinks member from employee", async () => {
    if (!member1Id) return;

    await updateMember(db, member1Id, {
      name: "Sync Employee One",
      role: "Anggota",
      status: "Nonaktif",
      joinDate: "2026-01-01",
      nik: testNik1,
      phone: "081234567890",
    });

    const emp = await db
      .query("SELECT id, is_member, member_id FROM employees WHERE id = ?")
      .get<any>(testEmpId1);
    expect(Boolean(emp?.is_member)).toBe(false);
    expect(emp?.member_id).toBeNull();

    // Re-activate
    await updateMember(db, member1Id, {
      name: "Sync Employee One",
      role: "Anggota",
      status: "Aktif",
      joinDate: "2026-01-01",
      nik: testNik1,
      phone: "081234567890",
    });

    const empReactivated = await db
      .query("SELECT id, is_member, member_id FROM employees WHERE id = ?")
      .get<any>(testEmpId1);
    expect(Boolean(empReactivated?.is_member)).toBe(true);
    expect(empReactivated?.member_id).toBe(member1Id);
  });

  test("deleteMember soft-delete unlinks member from employee", async () => {
    if (!member2Id) return;

    await deleteMember(db, member2Id);

    const emp = await db
      .query("SELECT id, is_member, member_id FROM employees WHERE id = ?")
      .get<any>(testEmpId2);
    expect(Boolean(emp?.is_member)).toBe(false);
    expect(emp?.member_id).toBeNull();
  });
});
