import { Providers } from './providers';
import './globals.css';
import { poppinsFont, linoirritFont } from '@/lib/fonts';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppinsFont.variable} ${linoirritFont.variable} h-full antialiased`}>
      <body style={{ margin: 0, padding: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}