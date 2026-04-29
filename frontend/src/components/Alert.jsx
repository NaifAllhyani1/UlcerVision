export default function Alert({ type = 'info', children, onClose }) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-sky-50 border-sky-200 text-sky-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  };

  return (
    <div
      className={`rounded-lg border px-4 py-3 flex items-center justify-between ${styles[type]}`}
      role="alert"
    >
      <span>{children}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-4 text-current opacity-70 hover:opacity-100"
          aria-label="Close"
        >
          ×
        </button>
      )}
    </div>
  );
}
