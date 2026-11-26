import type { EwaFeeTier } from '@shared/types';

export type PortalLoan = {
  id: string;
  purpose: string;
  amount: number;
  status: string;
  createdAt: string;
  totalAmount?: number;
  monthlyPayment?: number;
  interestAmount?: number;
  tenor?: number;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  rejectionReason?: string | null;
  attachments?: Array<{
    id: string;
    loanId: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number | null;
    isSupplemental: boolean;
    uploadedBy: string;
    createdAt: string;
  }>;
  attachmentCount?: number;
  [key: string]: unknown;
};

export type ScheduleRow = {
  id: string;
  installmentNo: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  paidAmount: number;
  status: string;
  lateFee?: number;
  [key: string]: unknown;
};

export type PaymentRow = {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  method?: string;
  [key: string]: unknown;
};

export interface MemberProfile {
  id: string;
  memberId?: string;
  name: string;
  email?: string;
  phone?: string;
  isCoopMember?: boolean;
  canViewShu?: boolean;
  totalSavings?: number;
  simpananPokok?: number;
  simpananWajib?: number;
  simpananSukarela?: number;
  loanInterestRate?: number;
  employee?: {
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    name?: string;
  };
  coopBank?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };
}

export type SavingsTransaction = {
  id: string;
  createdAt: string;
  type: string;
  amount: number;
  balanceAfter: number;
  [key: string]: unknown;
};

export type SavingsWithdrawal = {
  id: string;
  createdAt: string;
  amount: number;
  destinationBank: string;
  destinationAccount: string;
  destinationName: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  notes?: string;
  rejectionReason?: string;
  approvedAt?: string;
  [key: string]: unknown;
};

export type SavingsDeposit = {
  id: string;
  transferDate?: string;
  savingsType: 'pokok' | 'wajib' | 'sukarela';
  amount: number;
  senderBank?: string;
  senderAccount?: string;
  senderName?: string;
  proofUrl?: string;
  proofName?: string;
  status: 'Menunggu' | 'Diverifikasi' | 'Ditolak';
  notes?: string;
  rejectionReason?: string;
  verifiedAt?: string;
  [key: string]: unknown;
};

export interface EwaQuota {
  maxMonthlyLimit?: number;
  remainingQuota?: number;
  totalUsedThisMonth?: number;
  totalPayrollDeductionThisMonth?: number;
  totalDisbursedThisMonth?: number;
  totalFeeThisMonth?: number;
  pendingPayrollDeductionThisMonth?: number;
  previousUnsettledPayrollDeduction?: number;
  previousUnsettledDisbursed?: number;
  previousUnsettledFee?: number;
  previousPeriodMonth?: string;
  previousCycleStartDate?: string;
  previousCycleEndDate?: string;
  dailyAccumulatedLimit?: number;
  currentDayInCycle?: number;
  totalDaysInCycle?: number;
  cycleStartDate?: string;
  cycleEndDate?: string;
  isEligible?: boolean;
  ineligibilityReason?: string;
  coopLoanDeduction?: number;
  maxAllowedPercentage?: number;
  feeTiers?: EwaFeeTier[];
  isMember?: boolean;
  employee?: {
    name?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
  };
}

export type EwaHistoryItem = {
  id: string;
  createdAt: string;
  destinationBank: string;
  destinationAccount: string;
  disbursedAmount: number;
  feeAmount: number;
  feePercentage: number;
  totalPayrollDeduction: number;
  status: string;
  rejectionReason?: string;
  [key: string]: unknown;
};

export interface ShuData {
  year: string;
  isClosed?: boolean;
  closedAt?: string;
  availableYears?: string[];
  realization?: {
    member?: {
      shu?: number;
      savingsShare?: number;
      loansShare?: number;
    };
  };
  projection?: {
    member?: {
      shu?: number;
      savingsShare?: number;
      loansShare?: number;
      averageSavings?: number;
    };
    totalCoopSavings: number;
    jasaSimpananPool?: number;
    jasaPinjamanPool?: number;
  };
  config?: {
    jasaSimpananPct?: number;
    jasaPinjamanPct?: number;
  };
  historical?: Array<{
    year: string;
    savingsShare: number;
    loansShare: number;
    totalSHU: number;
    closedAt?: string;
    [key: string]: unknown;
  }>;
}

export interface IncomeData {
  totalRevenue?: number;
  totalExpense?: number;
  netIncome?: number;
}

export interface BalanceData {
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
}

export interface CashflowData {
  totalInflow?: number;
  totalOutflow?: number;
  netCashFlow?: number;
  totalCashBalance?: number;
  inflows?: Array<{ label: string; total: number }>;
  outflows?: Array<{ label: string; total: number }>;
}
