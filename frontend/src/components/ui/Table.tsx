import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TableProps {
  children?: ReactNode;
  className?: string;
}

interface TableRowProps extends TableProps {
  onClick?: () => void;
}

export function Table({ children, className }: TableProps) {
  return (
    <div
      className="overflow-hidden overflow-x-auto"
      style={{
        background: '#1E1E28',
        border: '1px solid #2A2A38',
        borderRadius: 10,
      }}
    >
      <table className={cn('w-full border-collapse', className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className }: TableProps) {
  return (
    <thead
      className={cn(className)}
      style={{
        background: '#252532',
        borderBottom: '1px solid #2A2A38',
      }}
    >
      {children}
    </thead>
  );
}

export function TableBody({ children, className }: TableProps) {
  return <tbody className={className}>{children}</tbody>;
}

export function TableRow({ children, className, onClick }: TableRowProps) {
  return (
    <tr
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className={cn(
        'transition-colors duration-150',
        onClick && 'cursor-pointer hover:bg-[rgba(255,255,255,0.025)]',
        className
      )}
      style={{
        height: 40,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className }: TableProps) {
  return (
    <th
      className={cn('text-left font-semibold uppercase tracking-[0.06em]', className)}
      style={{
        padding: '7px 14px',
        fontSize: 11,
        color: '#5C5C75',
      }}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className }: TableProps) {
  return (
    <td
      className={cn('text-[13px] text-text-secondary', className)}
      style={{
        padding: '9px 14px',
      }}
    >
      {children}
    </td>
  );
}
