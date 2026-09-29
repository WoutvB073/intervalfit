import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: IconName;
  block?: boolean;
  children?: ReactNode;
};

export function Button({ variant = 'secondary', size = 'md', icon, block, className = '', children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} btn--${size}${block ? ' btn--block' : ''} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 24 : 22} />}
      {children && <span>{children}</span>}
    </button>
  );
}

/** Ronde knop met alleen een icoon; `label` is verplicht voor schermlezers. */
export function IconButton({
  icon,
  label,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
    </button>
  );
}
