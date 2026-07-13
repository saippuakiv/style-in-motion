import type { Metadata } from 'next';
import '../tokens.css';
import '../shell.css';

export const metadata: Metadata = {
  title: 'motion-ui',
  description:
    'A motion-first component library with AI-configurable design tokens',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  );
}
