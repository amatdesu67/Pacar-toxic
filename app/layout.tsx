import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'AI Pacar Toxic',
  description: 'Chat sama pacar virtual yang toxic-supportive. Drama, sindiran, tapi genuinely care.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${geistSans.variable} font-sans antialiased bg-[#0b141a]`}>
        {children}
      </body>
    </html>
  );
}
