import React, { useState } from 'react';
import { HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import type { TextWeight, TextColor } from '@astryxdesign/core/Text';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { useToast } from '@astryxdesign/core/Toast';
import { DocumentDuplicateIcon, CheckIcon } from '@heroicons/react/24/outline';
import { formatRp } from '../utils/format';

export interface CopyableAmountProps {
  amount?: number | string | null;
  weight?: TextWeight;
  color?: TextColor;
  showIcon?: boolean;
  style?: React.CSSProperties;
  textStyle?: React.CSSProperties;
}

export function CopyableAmount({
  amount,
  weight = 'medium',
  color = 'primary',
  showIcon = true,
  style,
  textStyle,
}: CopyableAmountProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || ''));
  const isValid = !isNaN(num) && amount !== null && amount !== undefined;
  const plainDigits = isValid ? String(Math.round(num)) : '';

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!plainDigits) return;

    let success = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(plainDigits);
        success = true;
      }
    } catch {
      // Fallback below
    }

    if (!success) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = plainDigits;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      try {
        toast({
          body: `Nominal ${plainDigits} disalin!`,
          type: 'info',
        });
      } catch {
        // toast context optional
      }
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isValid) {
    return (
      <Text type="body" weight={weight} color="secondary" style={textStyle}>
        -
      </Text>
    );
  }

  return (
    <HStack vAlign="center" gap={1} wrap="nowrap" style={{ display: 'inline-flex', ...style }}>
      <span
        onClick={handleCopy}
        title={plainDigits ? `Klik untuk salin nominal: ${plainDigits}` : undefined}
        style={{
          cursor: plainDigits ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          userSelect: 'all',
        }}
      >
        <Text type="body" weight={weight} color={color} style={textStyle}>
          {formatRp(num)}
        </Text>
      </span>
      {showIcon && plainDigits && (
        <IconButton
          icon={
            <Icon
              icon={copied ? CheckIcon : DocumentDuplicateIcon}
              color={copied ? 'success' : undefined}
            />
          }
          label="Salin nominal dicairkan"
          tooltip={copied ? `Tersalin: ${plainDigits}` : 'Salin nominal'}
          size="sm"
          variant={copied ? 'secondary' : 'ghost'}
          onClick={handleCopy}
        />
      )}
    </HStack>
  );
}
