import type { ButtonHTMLAttributes, FormEventHandler, LabelHTMLAttributes, ReactNode, TableHTMLAttributes } from 'react';

/**
 * Shared building blocks for the migrated health-report pages (Login,
 * Register, Dashboard, ReportDetail, Profile, Data) — the spacious,
 * form/card/table CRUD-dashboard style, as opposed to `components/common.tsx`,
 * which stays scoped to the dense Anatomy-explorer panel UI. Both read the
 * same `hud-*` theme tokens (tailwind.config.js), so they're visually
 * consistent without being the same component library.
 */

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1200px] p-5">{children}</div>;
}

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Render as a <form> instead of a <div> — e.g. for an inline edit card — while keeping the same visual shell. */
  as?: 'div' | 'form';
  onSubmit?: FormEventHandler<HTMLFormElement>;
}

export function Card({ children, className = '', as = 'div', onSubmit }: CardProps) {
  const sharedClassName = `rounded-lg bg-hud-panel p-5 shadow ${className}`;
  if (as === 'form') {
    return (
      <form className={sharedClassName} onSubmit={onSubmit}>
        {children}
      </form>
    );
  }
  return <div className={sharedClassName}>{children}</div>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-10 py-5 text-center">
      <h1 className="mb-2.5 text-2xl font-semibold text-hud-text">{title}</h1>
      {subtitle && <p className="text-base text-hud-muted">{subtitle}</p>}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger';

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // App A's own button blue (#007bff) — deliberately distinct from hud-cyan
  // (#3498db, the nav/link/selection accent). App A was never fully
  // internally consistent about this, and reconciling the two is out of
  // scope for this migration; both are carried forward as-is.
  primary: 'bg-[#007bff] text-white hover:bg-[#0056b3]',
  secondary: 'bg-[#6c757d] text-white hover:bg-[#545b62]',
  danger: 'bg-[#dc3545] text-white hover:bg-[#c82333]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled}
      {...rest}
    />
  );
}

/** Shared class string (not a wrapping component) so `<input>`/`<select>`/`<textarea>` can all use it directly without an extra layer. */
export const fieldClassName =
  'w-full rounded border border-hud-borderLight px-2.5 py-2.5 text-sm text-hud-text bg-hud-panel focus:border-[#007bff] focus:outline-none focus:ring-2 focus:ring-[#007bff]/25 disabled:bg-hud-panel2 disabled:text-hud-muted';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
  error?: string;
}

export function FormField({ label, htmlFor, children, error }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-hud-text">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-hud-red">{error}</p>}
    </div>
  );
}

export function Table({ children, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className="w-full border-collapse text-sm" {...rest}>
      {children}
    </table>
  );
}

export function TableHeadCell({ children, ...rest }: LabelHTMLAttributes<HTMLTableCellElement> & { children: ReactNode }) {
  return (
    <th className="border-b-2 border-hud-borderLight bg-hud-panel2 px-3 py-2.5 text-left font-semibold text-hud-text" {...rest}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`border-b border-hud-border px-3 py-2.5 ${className}`}>{children}</td>;
}

export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex h-full min-h-[40vh] w-full items-center justify-center text-hud-muted">
      <span className="text-sm">{message}</span>
    </div>
  );
}

export function AlertBanner({ tone, children }: { tone: 'danger' | 'success'; children: ReactNode }) {
  const toneClasses =
    tone === 'danger'
      ? 'bg-hud-red/10 text-hud-red border-hud-red/30'
      : 'bg-hud-green/10 text-hud-green border-hud-green/30';
  return <div className={`mb-4 rounded border px-4 py-3 text-sm ${toneClasses}`}>{children}</div>;
}
