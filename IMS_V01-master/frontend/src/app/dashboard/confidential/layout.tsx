'use client';

import React from 'react';
import { ConfidentialGuard } from '@/components/ConfidentialGuard';

export default function ConfidentialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConfidentialGuard>{children}</ConfidentialGuard>;
}
