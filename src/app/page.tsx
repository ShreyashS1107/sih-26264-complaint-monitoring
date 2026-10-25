export default function HomePage() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1>AICTE Complaint Monitoring & Tracking System</h1>
      <p style={{ maxWidth: '600px', color: '#555' }}>
        Problem Statement ID: SIH 26264 | Team Matrix Maya
      </p>
      <div
        style={{
          marginTop: '1.5rem',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          background: '#f4f4f5',
          fontSize: '0.9rem',
          color: '#333',
        }}
      >
        <strong>Phase 2 Complete:</strong> Development toolchain, TypeScript strict mode, ESLint,
        Prettier, Vitest, and Zod configured.
      </div>
    </main>
  );
}
