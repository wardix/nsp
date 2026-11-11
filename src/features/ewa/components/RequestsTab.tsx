import React, { useMemo } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Selector } from '@astryxdesign/core/Selector';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Pagination } from '../../../components/Pagination';
import { CopyableAccountNumber } from '../../../components/CopyableAccountNumber';
import { CopyableAmount } from '../../../components/CopyableAmount';
import { formatRp } from '../../../utils/format';
import { maskName, maskNip } from '../../../utils/privacyMask';
import type { EWARequest } from '../types';

interface RequestsTabProps {
  requests: EWARequest[];
  reqLoading: boolean;
  reqSearch: string;
  setReqSearch: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  disbursedByFilter: string;
  setDisbursedByFilter: (val: string) => void;
  disbursedStartDate: string;
  setDisbursedStartDate: (val: string) => void;
  disbursedEndDate: string;
  setDisbursedEndDate: (val: string) => void;
  operators: Array<{ id: string; name: string }>;
  reqPage: number;
  reqLimit: number;
  reqTotal: number;
  setReqPage: (val: number) => void;
  isDemoMode: boolean;
  actionLoading: boolean;
  onDisburse: (req: EWARequest) => void;
  onReject: (req: EWARequest) => void;
}

export function RequestsTab({
  requests,
  reqLoading,
  reqSearch,
  setReqSearch,
  statusFilter,
  setStatusFilter,
  disbursedByFilter,
  setDisbursedByFilter,
  disbursedStartDate,
  setDisbursedStartDate,
  disbursedEndDate,
  setDisbursedEndDate,
  operators = [],
  reqPage,
  reqLimit,
  reqTotal,
  setReqPage,
  isDemoMode,
  actionLoading,
  onDisburse,
  onReject,
}: RequestsTabProps) {
  const formatDisbursedDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const datePart = d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      });
      const timePart = d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      }).replace('.', ':');
      return `${datePart}, ${timePart} WIB`;
    } catch {
      return dateStr;
    }
  };

  const requestColumns: TableColumn<EWARequest>[] = useMemo(
    () => [
      {
        key: 'date',
        header: 'Tanggal',
        width: pixel(110),
        renderCell: (r: EWARequest) => (
          <Text type="supporting">
            {new Date(r.createdAt).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        ),
      },
      {
        key: 'employee',
        header: 'Karyawan',
        width: proportional(1.5),
        renderCell: (r: EWARequest) => {
          const empName = isDemoMode ? maskName(r.employeeId || r.id, r.employeeName) : r.employeeName;
          const empNip = isDemoMode ? maskNip(r.employeeId || r.id, r.employeeNip) : (r.employeeNip || '-');
          return (
            <VStack gap={0}>
              <Text type="body" weight="medium">
                {empName}
              </Text>
              <HStack gap={1} vAlign="center">
                <Text type="supporting" color="secondary">
                  NIP: {empNip}
                </Text>
                <Badge variant={r.isMember ? 'success' : 'neutral'} label={r.isMember ? 'Anggota' : 'Non-Anggota'} />
              </HStack>
            </VStack>
          );
        },
      },
      {
        key: 'amount',
        header: 'Nominal Tarik',
        width: proportional(1.2),
        renderCell: (r: EWARequest) => (
          <VStack gap={0}>
            <CopyableAmount amount={r.disbursedAmount} weight="semibold" color="primary" />
            <Text type="supporting" color="secondary">
              Fee: {formatRp(r.feeAmount)} ({r.feePercentage}%)
            </Text>
          </VStack>
        ),
      },
      {
        key: 'deduction',
        header: 'Potong Payroll',
        width: proportional(1.2),
        renderCell: (r: EWARequest) => (
          <Text type="body" weight="bold">
            {formatRp(r.totalPayrollDeduction)}
          </Text>
        ),
      },
      {
        key: 'bank',
        header: 'Rekening Tujuan',
        width: proportional(1.5),
        renderCell: (r: EWARequest) => (
          <CopyableAccountNumber
            bankName={r.destinationBank}
            accountNumber={r.destinationAccount}
            accountHolder={r.destinationName}
          />
        ),
      },
      {
        key: 'status',
        header: 'Status',
        width: pixel(180),
        renderCell: (r: EWARequest) => {
          const reason = r.rejectionReason || (r as any).rejection_reason;
          const isDisbursedOrSettled = r.status === 'DISBURSED' || r.status === 'PAID_SETTLED';
          return (
            <VStack gap={1} hAlign="start">
              <StatusBadge status={r.status} />
              {isDisbursedOrSettled && (
                <>
                  {r.disbursedByName && (
                    <Text type="supporting" color="secondary" style={{ fontSize: 11, lineHeight: 1.2 }}>
                      oleh {isDemoMode ? maskName(r.disbursedBy || r.disbursedByName, r.disbursedByName) : r.disbursedByName}
                    </Text>
                  )}
                  {r.disbursedAt && (
                    <Text type="supporting" color="secondary" style={{ fontSize: 11, lineHeight: 1.2 }}>
                      {formatDisbursedDateTime(r.disbursedAt)}
                    </Text>
                  )}
                </>
              )}
              {r.status === 'REJECTED' && reason && (
                <Text type="supporting" style={{ color: 'var(--color-text-error)', fontSize: 11, lineHeight: 1.2 }}>
                  Alasan: {reason}
                </Text>
              )}
            </VStack>
          );
        },
      },
      {
        key: 'action',
        header: 'Aksi',
        width: pixel(180),
        renderCell: (r: EWARequest) =>
          r.status === 'PENDING' && (
            <HStack gap={2}>
              <Button
                label="Cairkan"
                variant="primary"
                size="sm"
                isDisabled={actionLoading}
                onClick={() => onDisburse(r)}
              />
              <Button
                label="Tolak"
                variant="ghost"
                size="sm"
                isDisabled={actionLoading}
                onClick={() => onReject(r)}
              />
            </HStack>
          ),
      },
    ],
    [isDemoMode, actionLoading, onDisburse, onReject]
  );

  return (
    <Card>
      <VStack gap={4}>
        <HStack justify="between" vAlign="center" wrap="wrap" gap={3}>
          <Heading level={4}>Daftar Pengajuan Penarikan Gaji Awal</Heading>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Cari nama karyawan / NIP..."
                value={reqSearch}
                onChange={(e) => {
                  setReqSearch(e.target.value);
                  setReqPage(1);
                }}
                style={{
                  padding: '6px 30px 6px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border-primary)',
                  backgroundColor: 'var(--color-background-primary)',
                  color: 'var(--color-text-primary)',
                  width: 240,
                  fontSize: 13,
                }}
              />
              {reqSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setReqSearch('');
                    setReqPage(1);
                  }}
                  style={{
                    position: 'absolute',
                    right: 8,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-secondary)',
                    padding: 0,
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                  title="Hapus pencarian"
                >
                  ✕
                </button>
              )}
            </div>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Selector
                label="Operator Pencair"
                size="sm"
                value={disbursedByFilter}
                onChange={(val) => {
                  setDisbursedByFilter(val);
                  setReqPage(1);
                }}
                options={[
                  { value: '', label: 'Semua Operator' },
                  ...operators.map((op) => ({
                    value: op.id,
                    label: isDemoMode ? maskName(op.id, op.name) : op.name,
                  })),
                ]}
                width={180}
              />
              <Selector
                label="Status"
                size="sm"
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setReqPage(1);
                }}
                options={[
                  { value: '', label: 'Semua Status' },
                  { value: 'PENDING', label: 'Menunggu Cair' },
                  { value: 'DISBURSED', label: 'Sudah Cair' },
                  { value: 'PAID_SETTLED', label: 'Lunas Payroll' },
                  { value: 'REJECTED', label: 'Ditolak' },
                ]}
                width={170}
              />
              <HStack gap={2} vAlign="end">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    aria-label="Dari Tanggal Pencairan"
                    value={disbursedStartDate}
                    onChange={(e) => {
                      setDisbursedStartDate(e.target.value);
                      setReqPage(1);
                    }}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border-primary)',
                      backgroundColor: 'var(--color-background-primary)',
                      color: 'var(--color-text-primary)',
                      fontSize: 13,
                      height: 32,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    aria-label="Sampai Tanggal Pencairan"
                    value={disbursedEndDate}
                    onChange={(e) => {
                      setDisbursedEndDate(e.target.value);
                      setReqPage(1);
                    }}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border-primary)',
                      backgroundColor: 'var(--color-background-primary)',
                      color: 'var(--color-text-primary)',
                      fontSize: 13,
                      height: 32,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                {(disbursedStartDate || disbursedEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDisbursedStartDate('');
                      setDisbursedEndDate('');
                      setReqPage(1);
                    }}
                    style={{
                      height: 32,
                      padding: '0 8px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border-primary)',
                      backgroundColor: 'transparent',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      fontSize: 13,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Reset filter tanggal"
                    aria-label="Reset filter tanggal"
                  >
                    ✕
                  </button>
                )}
              </HStack>
            </HStack>
          </HStack>
        </HStack>

        {reqLoading ? (
          <Spinner size="md" />
        ) : requests.length > 0 ? (
          <VStack gap={3}>
            <Table data={requests} columns={requestColumns} idKey="id" density="balanced" />
            <Pagination
              page={reqPage}
              limit={reqLimit}
              total={reqTotal}
              onPageChange={setReqPage}
            />
          </VStack>
        ) : (
          <Text type="supporting" color="secondary">
            {reqSearch || statusFilter || disbursedByFilter || disbursedStartDate || disbursedEndDate
              ? 'Tidak ditemukan pengajuan EWA yang sesuai dengan filter pencarian.'
              : 'Belum ada data pengajuan EWA'}
          </Text>
        )}
      </VStack>
    </Card>
  );
}
