import classNames from 'classnames';
import type { ReactNode } from 'react';

export interface FormGroupProps {
  children: ReactNode;
  label: string; // For accessibility reasons this must always be set for screen readers. If you want it to not show, then add labelClassName="sr-only"
  labelFor: string; // Same as above
  hideLabel?: boolean;
  labelAlign?: 'left' | 'right';
}

export const FormGroup = ({
  children,
  label,
  labelFor,
  labelAlign = 'left',
  hideLabel = false,
}: FormGroupProps) => {
  const labelClasses = classNames('block mb-2 text-sm', {
    'text-right': labelAlign === 'right',
    'sr-only': hideLabel,
  });
  return (
    <div data-testid="form-group" className="relative mb-6">
      {label && (
        <label htmlFor={labelFor} className={labelClasses}>
          {label}
        </label>
      )}
      {children}
    </div>
  );
};
