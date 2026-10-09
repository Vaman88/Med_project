import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./kitchen.css";
const kitchenFont = localFont({
  src: [
    { path: '../../public/fonts/nunito-sans-400.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/nunito-sans-600.ttf', weight: '600', style: 'normal' },
    { path: '../../public/fonts/nunito-sans-700.ttf', weight: '700', style: 'normal' },
    { path: '../../public/fonts/nunito-sans-800.ttf', weight: '800', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-kitchen',
});
export const metadata: Metadata = {
  title: "Healthy Steps — meals that work for your family",
  description: "Simple pantry-first food planning, grocery budgeting, food preferences, and public food support."
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={kitchenFont.variable}><body>{children}</body></html>;
}
