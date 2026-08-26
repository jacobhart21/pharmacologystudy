import type { Metadata } from 'next';
import './globals.css';

const siteOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://doselab-calculation-practice.jacobhart21.chatgpt.site';

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: 'DoseLab — Dosage Calculation Practice',
  description: 'Build confidence with randomly generated dosage, percentage, ratio, dilution, and conversion practice problems.',
  applicationName: 'DoseLab',
  openGraph: {
    type: 'website',
    title: 'DoseLab — Dosage Calculation Practice',
    description: 'Dosage calculation practice, one worked step at a time.',
    images: [{
      url: '/og.png',
      width: 1672,
      height: 941,
      alt: 'DoseLab — dosage calculation practice, one worked step at a time.',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DoseLab — Dosage Calculation Practice',
    description: 'Dosage calculation practice, one worked step at a time.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
