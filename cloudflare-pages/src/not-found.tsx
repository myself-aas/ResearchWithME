import Link from 'next/link';

export default function NotFound() {
  return (
    <main tabIndex={-1} id="main-content"
      style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        maxWidth: '42rem',
        margin: '0 auto',
        padding: '6rem 1.5rem',
        color: '#161C1A',
      }}
    >
      <p
        style={{
          fontSize: '0.75rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#4F46E5',
          margin: 0,
        }}
      >
        Error 404
      </p>
      <h1 style={{ fontSize: '3.25rem', lineHeight: 1.05, letterSpacing: '-0.03em', margin: '1rem 0 1.25rem' }}>
        Page not found
      </h1>
      <p style={{ fontSize: '1.125rem', lineHeight: 1.6, color: '#3F4542' }}>
        The page you were looking for does not exist or was moved.
      </p>
      <p style={{ marginTop: '2rem' }}>
        <Link href="/" style={{ color: '#4F46E5' }}>
          Back to the journal
        </Link>
      </p>
    </main>
  );
}
