import React, { useState, useEffect } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { CopyableAccountNumber } from '../../../components/CopyableAccountNumber';
import { CopyableAmount } from '../../../components/CopyableAmount';
import { formatRp } from '../../../utils/format';
import { maskName, maskNip } from '../../../utils/privacyMask';
import { apiFetch } from '../../../config';
import type { EWARequest, PaymentSourceAccount } from '../types';

interface DisburseModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: EWARequest | null;
  paymentSources: PaymentSourceAccount[];
  isDemoMode: boolean;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function DisburseModal({
  isOpen,
  onClose,
  request,
  paymentSources,
  isDemoMode,
  onSuccess,
  onError,
}: DisburseModalProps) {
  const [selectedPaymentSourceId, setSelectedPaymentSourceId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && request) {
      const kasKecil = paymentSources.find((a) => a.code === '11101');
      if (kasKecil) {
        setSelectedPaymentSourceId(kasKecil.id);
      } else if (paymentSources.length > 0) {
        setSelectedPaymentSourceId(paymentSources[0].id);
      }
    }
  }, [isOpen, request, paymentSources]);

  if (!isOpen || !request) return null;

  const handleConfirmDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/ewa/requests/${request.id}/disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentSourceAccountId: selectedPaymentSourceId || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        onSuccess(data.message || 'Dana berhasil dicairkan!');
        onClose();
      } else {
        onError(data.message || 'Gagal mencairkan EWA');
      }
    } catch (err: any) {
      onError(err?.message || 'Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Konfirmasi Pencairan Dana EWA"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <Card style={{ width: 480, padding: 24, maxWidth: '90%' }}>
        <form onSubmit={handleConfirmDisburse}>
          <VStack gap={4}>
            <Heading level={4}>Konfirmasi Pencairan Dana EWA</Heading>

            <Card style={{ padding: 16, backgroundColor: 'var(--color-background-secondary)' }}>
              <VStack gap={2}>
                <HStack justify="between">
                  <Text type="supporting">Karyawan:</Text>
                  <Text type="body" weight="semibold">
                    {isDemoMode ? maskName(request.employeeId || request.id, request.employeeName) : request.employeeName}
                  </Text>
                </HStack>
                <HStack justify="between">
                  <Text type="supporting">NIP / NIK:</Text>
                  <Text type="body">
                    {isDemoMode ? maskNip(request.employeeId || request.id, request.employeeNip) : (request.employeeNip || '-')}
                  </Text>
                </HStack>
                <HStack justify="between" vAlign="center">
                  <Text type="supporting">Nominal Dicairkan:</Text>
                  <CopyableAmount
                    amount={request.disbursedAmount}
                    weight="bold"
                    textStyle={{ color: 'var(--color-text-success)' }}
                  />
                </HStack>
                <HStack justify="between">
                  <Text type="supporting">Biaya Admin EWA:</Text>
                  <Text type="body">{formatRp(request.feeAmount)}</Text>
                </HStack>
                <HStack justify="between">
                  <Text type="supporting">Total Potong Payroll:</Text>
                  <Text type="body" weight="bold">
                    {formatRp(request.totalPayrollDeduction)}
                  </Text>
                </HStack>
                <HStack justify="between" vAlign="center">
                  <Text type="supporting">Tujuan Transfer:</Text>
                  <CopyableAccountNumber
                    bankName={request.destinationBank}
                    accountNumber={request.destinationAccount}
                    showHolder={false}
                  />
                </HStack>
                <HStack justify="between">
                  <Text type="supporting">Atas Nama:</Text>
                  <Text type="body">{request.destinationName}</Text>
                </HStack>
              </VStack>
            </Card>

            <VStack gap={1}>
              <Selector
                label="Sumber Dana Pencairan"
                value={selectedPaymentSourceId}
                onChange={setSelectedPaymentSourceId}
                options={
                  paymentSources.length > 0
                    ? paymentSources.map((acc) => ({ value: acc.id, label: `${acc.name} (${acc.code})` }))
                    : [
                        { value: '64fa79d2-cd8f-414a-80ac-7daae0e3fd1f', label: 'Kas Kecil (11101)' },
                        { value: 'ed0ad424-aff5-4a79-8fa2-24eaa541d6fc', label: 'Bank Mandiri (11102)' },
                      ]
                }
                width="100%"
              />
              <Text type="supporting" color="secondary" style={{ fontSize: 12 }}>
                Akun kas/bank yang dipilih akan dikreditkan secara otomatis pada Jurnal Akuntansi.
              </Text>
            </VStack>

            <HStack justify="end" gap={2}>
              <Button
                label="Batal"
                variant="ghost"
                type="button"
                onClick={onClose}
              />
              <Button
                label={loading ? 'Memproses...' : 'Konfirmasi Pencairan'}
                variant="primary"
                type="submit"
                isDisabled={loading}
              />
            </HStack>
          </VStack>
        </form>
      </Card>
    </div>
  );
}
