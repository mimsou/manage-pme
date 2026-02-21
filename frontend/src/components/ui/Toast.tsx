import { Toaster } from 'react-hot-toast';

export function Toast() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--color-bg-elevated)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border-subtle)',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: 'var(--color-success)',
            secondary: 'var(--color-text-primary)',
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: 'var(--color-danger)',
            secondary: 'var(--color-text-primary)',
          },
        },
      }}
    />
  );
}

