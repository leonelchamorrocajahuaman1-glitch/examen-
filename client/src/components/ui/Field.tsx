import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/format';

export const controlClass = (error?: string) =>
  cn(
    'w-full rounded-xl border bg-ink-800/80 px-3.5 text-[15px] text-fg placeholder:text-fg-subtle/70 transition-[border-color,box-shadow] duration-150 outline-none',
    'focus:border-cyan/70 focus:ring-2 focus:ring-cyan/20 disabled:opacity-50',
    error ? 'border-danger/70' : 'border-line hover:border-line-strong',
  );

interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string;
  id: string;
  children: ReactNode;
  className?: string;
  optional?: boolean;
}

export function FieldShell({ label, hint, error, id, children, className, optional }: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-fg-muted">
          {label}
          {optional && <span className="ml-1 font-normal text-fg-subtle">(opcional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  leading?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, optional, leading, className, wrapperClassName, id, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} id={inputId} className={wrapperClassName} optional={optional}>
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-subtle">{leading}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(controlClass(error), 'h-11', leading ? 'pl-10' : '', className)}
          {...rest}
        />
      </div>
    </FieldShell>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, className, wrapperClassName, id, children, ...rest },
  ref,
) {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <FieldShell label={label} error={error} hint={hint} id={selectId} className={wrapperClassName}>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={Boolean(error) || undefined}
        className={cn(controlClass(error), 'h-11 cursor-pointer appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238B8BA3' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, optional, className, wrapperClassName, id, ...rest },
  ref,
) {
  const auto = useId();
  const areaId = id ?? auto;
  return (
    <FieldShell label={label} error={error} hint={hint} id={areaId} className={wrapperClassName} optional={optional}>
      <textarea
        ref={ref}
        id={areaId}
        aria-invalid={Boolean(error) || undefined}
        className={cn(controlClass(error), 'min-h-24 py-2.5 leading-relaxed', className)}
        {...rest}
      />
    </FieldShell>
  );
});

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, error, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const boxId = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={boxId} className="group flex cursor-pointer items-start gap-3 text-sm text-fg-muted">
        <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={boxId}
            type="checkbox"
            className={cn(
              'peer size-5 cursor-pointer appearance-none rounded-md border bg-ink-800 transition-colors checked:border-violet checked:bg-violet',
              error ? 'border-danger' : 'border-line-strong group-hover:border-cyan/50',
            )}
            {...rest}
          />
          <Check className="pointer-events-none absolute size-3.5 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
        </span>
        <span className="leading-snug">{label}</span>
      </label>
      {error && <p className="mt-1 pl-8 text-xs text-danger">{error}</p>}
    </div>
  );
});
