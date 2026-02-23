'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BlurVignetteProps = {
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
};

// Inspired by ui-layouts blur-vignette: keeps edges soft while preserving center content.
export function BlurVignette({
  children,
  className,
  overlayClassName,
}: BlurVignetteProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {children}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0',
          'backdrop-blur-[2px]',
          'mask-[radial-gradient(circle_at_center,transparent_42%,black_90%)]',
          overlayClassName,
        )}
      />
    </div>
  );
}
