export interface DashboardData {
  activeMembers: string;
  totalSavings: number;
  /** Outstanding remaining principal (Disetujui + Macet, after payments) */
  totalLoans: number;
  /**
   * Original principal of approved/outstanding loans (status Disetujui + Macet).
   * Distinct from totalLoans which is remaining balance.
   */
  approvedLoansAmount: number;
  /** Count of loans with status Disetujui or Macet */
  approvedLoansCount: number;
  npl: string;
  roleData: Array<{label: string; value: number; color: string}>;
  purposeData: Array<{label: string; value: number; color: string}>;
  monthlyData: Array<{label: string; simpanan: number; pinjaman: number}>;
  recentActivities: Array<{id: string; activity: string; name: string; amount: number; date: string}>;
}

export interface PendingActionDetailItem {
  id: string;
  category: 'loan' | 'ewa' | 'savings_deposit' | 'savings_withdrawal' | 'feedback' | 'overdue_loan';
  title: string;
  subtitle: string;
  amount?: number;
  route: string;
  date?: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface PendingActionsData {
  totalPending: number;
  pendingLoans: number;
  pendingEwa: number;
  pendingSavingsDeposits: number;
  pendingSavingsWithdrawals: number;
  openFeedbacks: number;
  overdueLoansCount: number;
  items?: PendingActionDetailItem[];
}

export interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  category: 'master' | 'financial' | 'reports' | 'system';
}

export interface CompanyEmployee extends Record<string, unknown> {
  id: string;
  nip: string;
  nik?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
  baseSalary: number;
  memberId?: string | null;
  isMember: boolean;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  contractEndDate?: string | null;
  coopLoanDeduction?: number;
  effectiveSalary?: number;
  dailyAccumulatedLimit?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EWARequest extends Record<string, unknown> {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeNip?: string;
  isMember?: boolean;
  periodMonth: string;
  salaryBasis: number;
  maxLimit: number;
  amountRequested: number;
  feePercentage: number;
  feeAmount: number;
  disbursedAmount: number;
  totalPayrollDeduction: number;
  destinationBank?: string | null;
  destinationAccount?: string | null;
  destinationName?: string | null;
  status: 'PENDING' | 'APPROVED' | 'DISBURSED' | 'REJECTED' | 'PAID_SETTLED' | 'CANCELLED';
  rejectionReason?: string | null;
  disbursedAt?: string | null;
  disbursedBy?: string | null;
  disbursedByName?: string | null;
  settledAt?: string | null;
  createdAt: string;
}

export interface EwaQuotaInfo {
  employeeId: string;
  employeeName: string;
  isMember: boolean;
  periodMonth: string;
  baseSalary: number;
  coopLoanDeduction?: number; // Tagihan angsuran pinjaman koperasi bulan ini
  effectiveSalary?: number;   // Gaji bersih setelah dikurangi angsuran pinjaman koperasi
  maxAllowedPercentage: number; // 50
  maxMonthlyLimit: number; // Plafon sebulan penuh (50% dari effectiveSalary)
  currentDay?: number; // Tanggal kalender (1..31)
  currentDayInCycle?: number; // Hari ke-d dalam siklus penggajian berjalan
  totalDaysInCycle?: number; // Total hari dalam siklus penggajian berjalan (e.g. 30/31)
  cycleStartDate?: string; // Tanggal awal siklus penggajian (YYYY-MM-DD)
  cycleEndDate?: string; // Tanggal akhir / cut-off siklus penggajian (YYYY-MM-DD)
  cutoffDay?: number; // Tanggal cut-off (default: 25)
  progressivePercentage?: number; // Persentase progresif akumulatif (e.g. 51.61%)
  dailyAccumulatedLimit?: number; // Plafon maksimal akumulatif progresif s/d hari ini
  totalUsedThisMonth: number;
  totalPayrollDeductionThisMonth?: number; // Total potong payroll transaksi cair siklus ini (pokok + fee)
  totalDisbursedThisMonth?: number;        // Total pokok pencairan transaksi cair siklus ini
  totalFeeThisMonth?: number;              // Total biaya admin transaksi cair siklus ini
  pendingPayrollDeductionThisMonth?: number; // Total estimasi potong payroll pengajuan pending siklus ini
  previousUnsettledPayrollDeduction?: number; // Total tagihan potong payroll periode sebelumnya yang belum lunas (status DISBURSED / transferred)
  previousUnsettledDisbursed?: number;        // Pokok penarikan periode sebelumnya yang belum lunas
  previousUnsettledFee?: number;              // Fee penarikan periode sebelumnya yang belum lunas
  previousPeriodMonth?: string;               // Periode bulan sebelumnya (YYYY-MM)
  previousCycleStartDate?: string;            // Tanggal awal siklus periode sebelumnya (YYYY-MM-DD)
  previousCycleEndDate?: string;              // Tanggal akhir siklus periode sebelumnya (YYYY-MM-DD)
  remainingQuota: number; // Sisa kuota yang dapat diajukan hari ini (dailyAccumulatedLimit - totalUsedThisMonth)
  feePercentage: number; // e.g. 2.0% (member) vs 3.5% (non-member)
  isEligible?: boolean;
  ineligibilityReason?: string | null;
  contractEndDate?: string | null;
}

export interface EwaFeeTier extends Record<string, unknown> {
  id: string;
  minAmount: number;
  maxAmount: number | null;
  memberFee: number;
  nonMemberFee: number;
  tierOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemberRow extends Record<string, unknown> {
  id: string;
  name: string;
  role: 'Anggota' | 'Ketua' | 'Bendahara' | 'Sekretaris' | 'Admin' | string;
  status: 'Aktif' | 'Pasif' | string;
  joinDate: string;
  /** Nomor Induk Kependudukan (16 digit), optional */
  nik?: string | null;
  /** Nomor telepon / HP, optional */
  phone?: string | null;
  simpananPokok: number;
  simpananWajib: number;
  simpananSukarela: number;
  totalSavings: number;
  /** Portal login email (no password returned) */
  email?: string | null;
  /** Whether a portal password is set */
  hasPortalAccess?: boolean;
}

export interface LoanRow extends Record<string, unknown> {
  id: string;
  memberId: string;
  name: string;
  amount: number;
  tenor: number;
  purpose: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak' | 'Lunas' | 'Macet' | string;
  paidAmount?: number;
  interestAmount?: number;
  totalAmount?: number;
  /** Snapshot admin fee / interest rate (% p.a.) at approval */
  interestRate?: number | null;
  monthlyPayment?: number | null;
  /** Application / loan date (ISO) — set from loanDate on create */
  createdAt?: string;
  /** Disbursement / approval timestamp (ISO) */
  approvedAt?: string;
  /** Supporting document attachment URL */
  attachmentUrl?: string | null;
  /** Supporting document attachment original file name */
  attachmentName?: string | null;
  /** Destination bank name for disbursement transfer */
  destinationBank?: string | null;
  /** Destination bank account number */
  destinationAccount?: string | null;
  /** Destination bank account holder name */
  destinationName?: string | null;
  /** Alasan penolakan pengajuan pinjaman jika status Ditolak */
  rejectionReason?: string | null;
  /** Daftar berkas lampiran pendukung */
  attachments?: LoanAttachmentItem[];
  attachmentCount?: number;
}

export interface LoanAttachmentItem extends Record<string, unknown> {
  id: string;
  loanId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  isSupplemental: boolean;
  uploadedBy: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SettingsData {
  koperasiName?: string;
  alamat?: string;
  telepon?: string;
  email?: string;
  bungaPinjaman?: string;
  bungaSimpanan?: string;
  denda?: string;
  viewReports?: string | boolean;
  viewMemberShu?: string | boolean;
  selfRegister?: string | boolean;
  ssoAutoRegister?: string | boolean;
  coopBankName?: string;
  coopBankAccountNumber?: string;
  coopBankAccountName?: string;
  waNotificationEnabled?: string | boolean;
  waWebhookUrl?: string;
  waWebhookToken?: string;
  waNotificationTarget?: string;
  shu_cadangan_pct?: string;
  shu_anggota_pct?: string;
  shu_pengurus_pct?: string;
  shu_sosial_pct?: string;
  shu_pembangunan_pct?: string;
  shu_jasa_simpanan_pct?: string;
  shu_jasa_pinjaman_pct?: string;
  shu_include_inactive_members?: string | boolean;
}

export interface ShuConfig {
  cadanganPct: number;
  anggotaPct: number;
  pengurusPct: number;
  sosialPct: number;
  pembangunanPct: number;
  jasaSimpananPct: number;
  jasaPinjamanPct: number;
  includeInactiveMembers?: boolean;
}

export interface SavingsTransactionRow extends Record<string, unknown> {
  id: string;
  memberId: string;
  memberName?: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  createdBy: string;
}

export interface LoanPaymentRow extends Record<string, unknown> {
  id: string;
  loanId: string;
  borrowerName?: string;
  amount: number;
  paymentDate: string;
  method: string;
  type?: 'pencairan' | 'angsuran';
}

export interface CashflowRow extends Record<string, unknown> {
  source: 'savings' | 'loan_payment' | 'loan_disbursement' | 'expense';
  id: string;
  date: string;
  partyName?: string;
  description: string;
  amount: number;
  flowType: 'inflow' | 'outflow';
}

export type ExpenseCategory =
  | 'notaris'
  | 'atk'
  | 'sewa'
  | 'utilitas'
  | 'gaji'
  | 'transport'
  | 'pajak'
  | 'lainnya';

export interface ExpenseRow extends Record<string, unknown> {
  id: string;
  expenseDate: string;
  category: ExpenseCategory | string;
  description: string;
  amount: number;
  paymentMethod: string;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface CashflowResponse {
  data: CashflowRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netCash: number;
  };
}

export interface NplRow extends Record<string, unknown> {
  id: string;
  memberId: string;
  name: string;
  amount: number;
  tenor: number;
  purpose: string;
  status: string;
  paidAmount: number;
  interestAmount: number;
  totalAmount: number;
  remainingAmount: number;
  dpd?: number;
  agingBucket?: string;
  collectibility?: string;
  oldestOverdueDate?: string | null;
  createdAt?: string;
}

export interface NplResponse {
  data: NplRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalBadPrincipal: number;
    totalActivePrincipal: number;
    nplRatio: number;
    badAccountsCount: number;
    agingBuckets?: Record<string, number>;
  };
}

export interface ReportData {
  members: {
    totalMembers: number;
    activeMembers: number;
    passiveMembers: number;
    totalPokok: number;
    totalWajib: number;
    totalSukarela: number;
    totalSavings: number;
  };
  loans: {
    totalLoansCount: number;
    totalLoansAmount: number;
    activeLoansAmount: number;
    badLoansAmount: number;
    paidLoansAmount: number;
    totalPaymentsReceived: number;
  };
  timestamp: string;
}

export interface SavingsWithdrawalRow extends Record<string, unknown> {
  id: string;
  memberId: string;
  memberName?: string;
  memberNik?: string;
  amount: number;
  destinationBank: string;
  destinationAccount: string;
  destinationName: string;
  notes?: string | null;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  paymentSourceAccountId?: string | null;
  paymentSourceName?: string | null;
  transactionId?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsDepositRow extends Record<string, unknown> {
  id: string;
  memberId: string;
  memberName?: string;
  memberNik?: string;
  savingsType: 'pokok' | 'wajib' | 'sukarela';
  amount: number;
  transferDate: string;
  senderBank?: string | null;
  senderAccount?: string | null;
  senderName?: string | null;
  proofUrl?: string | null;
  proofName?: string | null;
  notes?: string | null;
  status: 'Menunggu' | 'Diverifikasi' | 'Ditolak';
  paymentTargetAccountId?: string | null;
  paymentTargetName?: string | null;
  transactionId?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountRow extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  type: string;
  normal_balance: string;
  is_active?: boolean;
  created_at?: string | null;
}

export interface JournalEntryRow extends Record<string, unknown> {
  id: string;
  transaction_date: string;
  description: string;
  reference_type?: string | null;
  reference_id?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}


