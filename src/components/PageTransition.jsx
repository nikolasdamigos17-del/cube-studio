// Content stays fully visible at all times — the cube spins behind it.
export default function PageTransition({ children }) {
  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      {children}
    </div>
  );
}
