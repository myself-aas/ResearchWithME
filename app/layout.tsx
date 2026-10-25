import type {Metadata} from 'next';
import './globals.css'; // Global styles
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'ResearchWithMe — Expert Essays, Research Breakdowns & Repo Teardowns',
  description: 'An independent blogging publication where domain authors review published research papers, GitHub repositories, trending tech, health, STEM, and sociology.',
  openGraph: {
    title: 'ResearchWithMe — Expert Essays, Research Breakdowns & Repo Teardowns',
    description: 'An independent blogging publication where domain authors review published research papers, GitHub repositories, trending tech, health, STEM, and sociology.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ResearchWithMe — Expert Essays, Research Breakdowns & Repo Teardowns',
    description: 'An independent blogging publication where domain authors review published research papers, GitHub repositories, trending tech, health, STEM, and sociology.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
