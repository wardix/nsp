import React from 'react';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Spinner } from '@astryxdesign/core/Spinner';
import { formatRp } from '../../../utils/format';
import { Grid } from './Grid';
import type { MemberProfile, EwaQuota, EwaHistoryItem } from '../types';
import type { EwaFeeTier } from '@shared/types';

interface EwaTabProps {
  profile: MemberProfile | null;
  ewaQuota: EwaQuota | null;
  ewaHistory: EwaHistoryItem[];
  feeTiers: EwaFeeTier[];
  ewaLoading: boolean;
  ewaAmount: string;
  setEwaAmount: (val: string) => void;
  ewaSubmitLoading: boolean;
  ewaError: string;
  ewaSuccess: string;
  onApplyEwa: (e: React.FormEvent) => void;
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid var(--color-border-primary)',
  borderRadius: 'var(--radius-md, 6px)',
  backgroundColor: 'var(--color-background-primary)',
  color: 'var(--color-text-primary)',
  fontFamily: 'inherit',
  fontSize: '14px',
  width: '100%',
  boxSizing: 'border-box',
};

export const EwaTab: React.FC<EwaTabProps> = ({
  profile,
  ewaQuota,
  ewaHistory,
  feeTiers,
  ewaLoading,
  ewaAmount,
  setEwaAmount,
  ewaSubmitLoading,
  ewaError,
  ewaSuccess,
  onApplyEwa,
}) => {
  if (ewaLoading) {
    return <Spinner size="md" />;
  }

  return (
    <VStack gap={6}>
      {/* Non-Member Conversion Banner */}
      {!profile?.isCoopMember && (
        <Card style={{ padding: 16, backgroundColor: 'var(--color-background-secondary)', border: '1px solid var(--color-warning-500)' }}>
          <HStack justify="between" vAlign="center" wrap="wrap" gap={3}>
            <VStack gap={1}>
              <Text type="body" weight="bold">
                💡 Hemat Biaya Layanan & Dapatkan SHU!
              </Text>
              <Text type="supporting" color="secondary">
                Tarif biaya admin EWA untuk Anggota Koperasi lebih hemat (mulai dari Rp 10.000 flat) dibandingkan bukan anggota. Bergabunglah menjadi Anggota Koperasi untuk menikmati tarif hemat serta pembagian Sisa Hasil Usaha (SHU) setiap tahun.
              </Text>
            </VStack>
            <Button
              label="Hubungi Pengurus Koperasi"
              variant="secondary"
              onClick={() => alert('Silakan hubungi bagian HRD / Pengurus Koperasi untuk formulir pendaftaran anggota baru.')}
            />
          </HStack>
        </Card>
      )}

      {/* Alert jika Kontrak Berakhir / Tidak Eligible */}
      {ewaQuota?.isEligible === false && (
        <Card style={{ padding: 16, backgroundColor: 'var(--color-background-danger-subtle)', border: '1px solid var(--color-critical-500)' }}>
          <HStack gap={3} vAlign="center">
            <VStack gap={1}>
              <Text type="body" weight="bold" style={{ color: 'var(--color-text-error)' }}>
                ⚠️ Pengajuan EWA Tidak Tersedia
              </Text>
              <Text type="supporting" style={{ color: 'var(--color-text-error)' }}>
                {ewaQuota?.ineligibilityReason || 'Masa kontrak kerja Anda telah berakhir atau status kepegawaian tidak aktif.'}
              </Text>
            </VStack>
          </HStack>
        </Card>
      )}

      {/* Banner Tagihan Potong Payroll Periode Sebelumnya (Menunggu Pelunasan Gaji) */}
      {Boolean(ewaQuota && (ewaQuota.previousUnsettledPayrollDeduction || 0) > 0) && ewaQuota && (
        <Card
          style={{
            padding: 16,
            backgroundColor: 'var(--color-background-warning-subtle)',
            border: '1px solid var(--color-warning-500)',
          }}
        >
          <VStack gap={2}>
            <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
              <Text type="body" weight="bold" style={{ color: 'var(--color-warning-900, inherit)' }}>
                ⏳ Tagihan Potong Payroll Periode Sebelumnya (Menunggu Pelunasan Gaji)
              </Text>
              {ewaQuota.previousPeriodMonth && (
                <Badge variant="warning" label={`Periode ${ewaQuota.previousPeriodMonth}`} />
              )}
            </HStack>
            <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
              <VStack gap={1}>
                <Heading level={2} style={{ color: 'var(--color-warning-900, inherit)' }}>
                  {formatRp(ewaQuota.previousUnsettledPayrollDeduction || 0)}
                </Heading>
                <Text type="supporting" color="secondary" style={{ fontSize: 12 }}>
                  Pokok {formatRp(ewaQuota.previousUnsettledDisbursed || 0)} + Biaya Admin{' '}
                  {formatRp(ewaQuota.previousUnsettledFee || 0)}
                  {ewaQuota.previousCycleStartDate && ewaQuota.previousCycleEndDate
                    ? ` • Siklus: ${ewaQuota.previousCycleStartDate} s/d ${ewaQuota.previousCycleEndDate}`
                    : ''}
                </Text>
              </VStack>
              <Text type="supporting" color="secondary" style={{ fontSize: 11, maxWidth: 360 }}>
                Nominal ini adalah penarikan EWA periode lalu yang akan dipotong pada slip gaji tanggal 28 bulan berjalan.
              </Text>
            </HStack>
          </VStack>
        </Card>
      )}

      {/* Kuota Grid - 4 Kartu Metrik Komprehensif */}
      <Grid gap={4}>
        <Card style={{ padding: 16 }}>
          <VStack gap={1}>
            <Text type="supporting">Plafon Maksimal Sebulan</Text>
            <Heading level={3}>{formatRp(ewaQuota?.maxMonthlyLimit || 0)}</Heading>
            <Text type="supporting" color="secondary" style={{ fontSize: 11 }}>
              {ewaQuota?.coopLoanDeduction && ewaQuota.coopLoanDeduction > 0
                ? `Maks. ${ewaQuota?.maxAllowedPercentage || 50}% gaji bersih (setelah pot. cicilan ${formatRp(ewaQuota.coopLoanDeduction)})`
                : `Maks. ${ewaQuota?.maxAllowedPercentage || 50}% gaji pokok per siklus`}
            </Text>
          </VStack>
        </Card>

        <Card style={{ padding: 16 }}>
          <VStack gap={1}>
            <Text type="supporting">
              Plafon Terbuka Hari Ini (Hari {ewaQuota?.currentDayInCycle || 1}/{ewaQuota?.totalDaysInCycle || 31})
            </Text>
            <Heading level={3}>{formatRp(ewaQuota?.dailyAccumulatedLimit ?? ewaQuota?.maxMonthlyLimit ?? 0)}</Heading>
            <Text type="supporting" color="secondary" style={{ fontSize: 11 }}>
              {ewaQuota?.cycleStartDate && ewaQuota?.cycleEndDate
                ? `Siklus: ${ewaQuota.cycleStartDate} s/d ${ewaQuota.cycleEndDate}`
                : `Akumulasi progresif harian`}
            </Text>
          </VStack>
        </Card>

        <Card style={{ padding: 16 }}>
          <VStack gap={1}>
            <Text type="supporting">Total Potong Payroll Siklus Ini</Text>
            <Heading level={3}>
              {formatRp(ewaQuota?.totalPayrollDeductionThisMonth ?? ewaQuota?.totalUsedThisMonth ?? 0)}
            </Heading>
            <Text type="supporting" color="secondary" style={{ fontSize: 11 }}>
              Pokok {formatRp(ewaQuota?.totalDisbursedThisMonth ?? ewaQuota?.totalUsedThisMonth ?? 0)} + Biaya Admin {formatRp(ewaQuota?.totalFeeThisMonth ?? 0)}
            </Text>
            {ewaQuota?.cycleStartDate && ewaQuota?.cycleEndDate && (
              <Text type="supporting" color="secondary" style={{ fontSize: 10 }}>
                Siklus: {ewaQuota.cycleStartDate} s/d {ewaQuota.cycleEndDate}
              </Text>
            )}
            {Boolean(ewaQuota?.pendingPayrollDeductionThisMonth && ewaQuota.pendingPayrollDeductionThisMonth > 0) && (
              <Text type="supporting" style={{ fontSize: 11, color: 'var(--color-warning-500)', fontWeight: 500 }}>
                + {formatRp(ewaQuota!.pendingPayrollDeductionThisMonth!)} masih menunggu pencairan
              </Text>
            )}
          </VStack>
        </Card>

        <Card style={{ padding: 16, backgroundColor: 'var(--color-background-primary-subtle)', border: '1px solid var(--color-primary-500)' }}>
          <VStack gap={1}>
            <HStack justify="between" vAlign="center">
              <Text type="supporting" weight="semibold">Sisa Kuota Siap Ditarik</Text>
              <Badge variant="info" label="Hari Ini" />
            </HStack>
            <Heading level={3} color="primary">{formatRp(ewaQuota?.remainingQuota || 0)}</Heading>
            <Text type="supporting" color="secondary" style={{ fontSize: 11 }}>
              Maksimal pencairan saat ini
            </Text>
          </VStack>
        </Card>
      </Grid>

      {/* Progres Visual Alokasi Plafon Siklus Ini */}
      {ewaQuota && (ewaQuota.maxMonthlyLimit || 0) > 0 && (() => {
        const maxLimit = ewaQuota.maxMonthlyLimit || 1;
        const used = Math.min(maxLimit, ewaQuota.totalUsedThisMonth || 0);
        const remaining = Math.min(maxLimit - used, ewaQuota.remainingQuota || 0);
        const future = Math.max(0, maxLimit - used - remaining);

        const usedPct = Math.round((used / maxLimit) * 100);
        const remainingPct = Math.round((remaining / maxLimit) * 100);
        const futurePct = Math.max(0, 100 - usedPct - remainingPct);

        return (
          <Card style={{ padding: 16, border: '1px solid var(--color-border-primary)' }}>
            <VStack gap={2}>
              <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                <VStack gap={0}>
                  <Text type="body" weight="bold">
                    Alokasi Plafon Siklus Payroll ({ewaQuota.cycleStartDate} s/d {ewaQuota.cycleEndDate})
                  </Text>
                  <Text type="supporting" color="secondary" style={{ fontSize: 12 }}>
                    Plafon EWA bertambah secara proporsional setiap hari kerja berjalan hingga batas bulanan penuh.
                  </Text>
                </VStack>
                <Badge
                  variant="neutral"
                  label={`Hari ke-${ewaQuota.currentDayInCycle || 1} dari ${ewaQuota.totalDaysInCycle || 30} hari`}
                />
              </HStack>

              {/* Bar Visual Progress */}
              <div
                style={{
                  height: 12,
                  borderRadius: 9999,
                  backgroundColor: 'var(--color-background-secondary)',
                  overflow: 'hidden',
                  display: 'flex',
                  width: '100%',
                  marginTop: 4,
                }}
              >
                {usedPct > 0 && (
                  <div
                    title={`Sudah ditarik: ${formatRp(used)} (${usedPct}%)`}
                    style={{
                      width: `${usedPct}%`,
                      backgroundColor: 'var(--color-warning-500)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                )}
                {remainingPct > 0 && (
                  <div
                    title={`Siap ditarik hari ini: ${formatRp(remaining)} (${remainingPct}%)`}
                    style={{
                      width: `${remainingPct}%`,
                      backgroundColor: 'var(--color-primary-500)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                )}
                {futurePct > 0 && (
                  <div
                    title={`Akan terbuka bertahap: ${formatRp(future)} (${futurePct}%)`}
                    style={{
                      width: `${futurePct}%`,
                      backgroundColor: 'var(--color-border-primary)',
                      opacity: 0.6,
                      transition: 'width 0.3s ease',
                    }}
                  />
                )}
              </div>

              {/* Keterangan Warna / Legend */}
              <HStack gap={4} wrap="wrap" style={{ fontSize: 12, marginTop: 4 }}>
                <HStack gap={1} vAlign="center">
                  <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--color-warning-500)', display: 'inline-block' }} />
                  <Text type="supporting" size="sm">Sudah Ditarik: <b>{formatRp(used)}</b> ({usedPct}%)</Text>
                </HStack>
                <HStack gap={1} vAlign="center">
                  <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--color-primary-500)', display: 'inline-block' }} />
                  <Text type="supporting" size="sm">Siap Ditarik Hari Ini: <b>{formatRp(remaining)}</b> ({remainingPct}%)</Text>
                </HStack>
                <HStack gap={1} vAlign="center">
                  <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--color-border-primary)', display: 'inline-block' }} />
                  <Text type="supporting" size="sm" color="secondary">Terbuka Bertahap: <b>{formatRp(future)}</b> ({futurePct}%)</Text>
                </HStack>
              </HStack>
            </VStack>
          </Card>
        );
      })()}

      {/* Form Pengajuan EWA */}
      <Card style={{ padding: 20, border: '1px solid var(--color-border-primary)' }}>
        <form onSubmit={onApplyEwa} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <VStack gap={1}>
            <Heading level={4}>Formulir Tarik Gaji Lebih Awal (Kasbon)</Heading>
            <Text type="supporting" color="secondary">
              Dana yang ditarik akan langsung ditransfer ke rekening bank Anda dan dipotong otomatis pada payroll gajian berikutnya. Limit bertambah secara progresif setiap hari seiring berjalannya hari kerja.
            </Text>
          </VStack>

          {ewaError && (
            <Text type="supporting" style={{ color: 'var(--color-text-error)', fontWeight: 600 }}>
              ⚠️ {ewaError}
            </Text>
          )}
          {ewaSuccess && (
            <Text type="supporting" style={{ color: 'var(--color-text-success)', fontWeight: 600 }}>
              ✅ {ewaSuccess}
            </Text>
          )}

          {/* Input Nominal Penarikan */}
          <VStack gap={2}>
            <Text type="supporting" weight="semibold">Nominal Penarikan (Rp):</Text>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Contoh: 500.000"
              value={ewaAmount}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                setEwaAmount(digits ? Number(digits).toLocaleString('id-ID') : '');
              }}
              style={{ ...inputStyle, fontSize: 16, fontWeight: 600 }}
              required
            />
            <Text type="supporting" size="sm" color="secondary">
              Maksimal penarikan hari ini: <b>{formatRp(ewaQuota?.remainingQuota || 0)}</b> (dari total plafon sebulan <b>{formatRp(ewaQuota?.maxMonthlyLimit || 0)}</b> • {ewaQuota?.cycleStartDate && ewaQuota?.cycleEndDate ? `Siklus ${ewaQuota.cycleStartDate} s/d ${ewaQuota.cycleEndDate}` : ''})
            </Text>
          </VStack>

          {/* Info Rekening Payroll Tujuan Pencairan */}
          <Card style={{ padding: 14, backgroundColor: 'var(--color-background-primary)', border: '1px solid var(--color-border-primary)' }}>
            <VStack gap={2}>
              <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                <Text type="supporting" weight="semibold">Rekening Payroll Tujuan Pencairan:</Text>
                <Badge variant="neutral" label="Rekening Resmi Payroll" />
              </HStack>
              <HStack gap={4} wrap="wrap">
                <VStack gap={0}>
                  <Text type="supporting" color="secondary" style={{ fontSize: 11 }}>Bank</Text>
                  <Text type="body" weight="medium">{ewaQuota?.employee?.bankName || 'Bank Mandiri'}</Text>
                </VStack>
                <VStack gap={0}>
                  <Text type="supporting" color="secondary" style={{ fontSize: 11 }}>Nomor Rekening</Text>
                  <Text type="body" weight="semibold">{ewaQuota?.employee?.bankAccountNumber || '-'}</Text>
                </VStack>
                <VStack gap={0}>
                  <Text type="supporting" color="secondary" style={{ fontSize: 11 }}>Nama Pemilik Rekening</Text>
                  <Text type="body" weight="medium">{ewaQuota?.employee?.bankAccountName || ewaQuota?.employee?.name || profile?.name || '-'}</Text>
                </VStack>
              </HStack>
            </VStack>
          </Card>

          {/* Simulasi Live Fee & Potongan */}
          {parseFloat(ewaAmount.replace(/\D/g, '')) > 0 && (() => {
            const numericAmount = parseFloat(ewaAmount.replace(/\D/g, '')) || 0;
            const isMember = Boolean(ewaQuota?.isMember ?? profile?.isCoopMember);
            const matchedTier = feeTiers.find((t) => {
              if (numericAmount < t.minAmount) return false;
              if (t.maxAmount != null && numericAmount > t.maxAmount) return false;
              return true;
            });

            const feeAmount = matchedTier
              ? (isMember ? matchedTier.memberFee : matchedTier.nonMemberFee)
              : Math.round((numericAmount * (isMember ? 2 : 3.5)) / 100);

            const tierLabel = matchedTier
              ? `Tier ${matchedTier.tierOrder} (${formatRp(matchedTier.minAmount)} s/d ${matchedTier.maxAmount != null ? formatRp(matchedTier.maxAmount) : 'Diatasnya'})`
              : `${isMember ? '2.0%' : '3.5%'}`;

            const totalDeduction = numericAmount + feeAmount;

            return (
              <Card style={{ padding: 16, backgroundColor: 'var(--color-background-secondary)' }}>
                <VStack gap={2}>
                  <Text type="body" weight="bold">Rincian & Simulasi Potongan Gaji</Text>
                  <HStack justify="between" wrap="wrap" gap={2}>
                    <Text type="supporting">Nominal Dana Yang Diterima:</Text>
                    <Text type="body" weight="semibold" style={{ color: 'var(--color-text-success)' }}>+{formatRp(numericAmount)}</Text>
                  </HStack>
                  <HStack justify="between" wrap="wrap" gap={2}>
                    <Text type="supporting">Biaya Admin ({tierLabel}):</Text>
                    <Text type="supporting">{formatRp(feeAmount)}</Text>
                  </HStack>
                  <HStack justify="between" wrap="wrap" gap={2} style={{ paddingTop: 6, borderTop: '1px solid var(--color-border-primary)' }}>
                    <Text type="body" weight="bold">Total Potongan Gaji Saat Payroll:</Text>
                    <Text type="body" weight="bold" color="primary">
                      {formatRp(totalDeduction)}
                    </Text>
                  </HStack>
                </VStack>
              </Card>
            );
          })()}

          <HStack justify="end" gap={3}>
            <Button
              label={ewaSubmitLoading ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Tarik Gaji'}
              variant="primary"
              type="submit"
              isDisabled={
                ewaSubmitLoading ||
                ewaQuota?.isEligible === false ||
                !parseFloat(ewaAmount.replace(/\D/g, '')) ||
                parseFloat(ewaAmount.replace(/\D/g, '')) > (ewaQuota?.remainingQuota || 0)
              }
            />
          </HStack>
        </form>
      </Card>

      {/* Riwayat Penarikan EWA */}
      <VStack gap={3}>
        <Heading level={4}>Riwayat Penarikan Gaji Awal Anda</Heading>
        {ewaHistory.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border-primary)' }}>
                  <th style={{ padding: '10px 12px' }}>Tanggal</th>
                  <th style={{ padding: '10px 12px' }}>Rekening Tujuan</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Nominal Cair</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Fee Layanan</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Potong Payroll</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {ewaHistory.map((h: any) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      {new Date(h.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{h.destinationBank} ({h.destinationAccount})</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-primary-500)' }}>
                      {formatRp(h.disbursedAmount)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatRp(h.feeAmount)} ({h.feePercentage}%)</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatRp(h.totalPayrollDeduction)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <VStack gap={1} hAlign="center">
                        <StatusBadge status={h.status} />
                        {h.status === 'REJECTED' && h.rejectionReason && (
                          <Text type="supporting" style={{ color: 'var(--color-text-error)', fontSize: 11 }}>
                            Alasan: {h.rejectionReason}
                          </Text>
                        )}
                      </VStack>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Text type="supporting" color="secondary">Belum ada riwayat penarikan EWA</Text>
        )}
      </VStack>
    </VStack>
  );
};
