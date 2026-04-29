export default function Spinner({ size = 'md' }) {
  const sizeClass = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8';
  return (
    <div
      className={`animate-spin rounded-full border-4 border-medical-200 border-t-medical-600 ${sizeClass}`}
      role="status"
      aria-label="Loading"
    />
  );
}
