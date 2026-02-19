import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Vendor Booking System',
  description: 'Vendor Booking & Trip Register System',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">
            <Providers>{children}</Providers>
          </main>
          <footer className="bg-gray-100 border-t border-gray-200 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <p className="text-gray-600 text-sm">
                  © {new Date().getFullYear()} Vendor Booking System. All rights reserved.
                </p>
                <div className="flex space-x-6 mt-4 sm:mt-0">
                  <a 
                    href="/privacy" 
                    className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    Privacy Policy
                  </a>
                  <a 
                    href="/terms" 
                    className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    Terms of Service
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
