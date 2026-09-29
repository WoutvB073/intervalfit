import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from './overlay';
import { Icon, type IconName } from './Icon';

/** Houdt het element nog even in beeld tijdens de sluit-animatie. */
function usePresence(open: boolean, ms = 260) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Twee frames wachten zodat de inschuif-animatie start vanuit de verborgen stand.
      let cancelled = false;
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => {
          if (!cancelled) setVisible(true);
        });
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return { mounted, visible };
}

/** Paneel dat van onderen inschuift. */
export function Sheet({
  open,
  onClose,
  title,
  tall,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Bijna schermvullend (lange lijsten). */
  tall?: boolean;
  children: ReactNode;
}) {
  useOverlay(open, onClose);
  const { mounted, visible } = usePresence(open);
  if (!mounted) return null;
  return createPortal(
    <div className={`overlay${visible ? ' is-visible' : ''}`} onClick={onClose}>
      <div
        className={`sheet${tall ? ' sheet--tall' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__grip" aria-hidden="true" />
        {title && (
          <div className="sheet__head">
            <h2 className="sheet__title">{title}</h2>
            <button type="button" className="sheet__close" aria-label="Sluiten" onClick={onClose}>
              <Icon name="close" size={22} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Een grote, duidelijke actieregel in een paneel. */
export function SheetAction({
  icon,
  label,
  hint,
  danger,
  onClick,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`sheet-action${danger ? ' sheet-action--danger' : ''}`} onClick={onClick}>
      <span className="sheet-action__icon">
        <Icon name={icon} />
      </span>
      <span className="sheet-action__text">
        <span className="sheet-action__label">{label}</span>
        {hint && <span className="sheet-action__hint">{hint}</span>}
      </span>
    </button>
  );
}

/** Bevestigingsvenster in het midden van het scherm. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Annuleren',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useOverlay(open, onCancel);
  const { mounted, visible } = usePresence(open, 200);
  if (!mounted) return null;
  return createPortal(
    <div className={`overlay overlay--center${visible ? ' is-visible' : ''}`} onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-title" className="dialog__title">
          {title}
        </h2>
        {message && <div className="dialog__message">{message}</div>}
        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary btn--md btn--block" onClick={onCancel} autoFocus>
            <span>{cancelLabel}</span>
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'} btn--md btn--block`}
            onClick={onConfirm}
          >
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
