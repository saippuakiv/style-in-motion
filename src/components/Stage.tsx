'use client';

/* ---------------------------------------------------------------
   Stage
   Mini-stage wrapper for preview cards that host overlay components
   (Toast, Dialog, Drawer). Position relative + overflow hidden,
   fills the card's content area. Overlays position absolutely
   within it, never against the viewport.
   --------------------------------------------------------------- */

export function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        minHeight: 120,
      }}
    >
      {children}
    </div>
  );
}
