import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./kitchen.css";
import "./little-kitchen.css";
import "./kitchen-game.css";
import "./assembly-game.css";
import "./child-redesign.css";
import "./game-usability.css";
import "./meal-picker.css";
import "./customer-order.css";
import "./recipe-builder.css";
import "./cooking-studio.css";
import "./kitchen-menu.css";
import "./adult-planner.css";
import "./role-chooser.css";
import "./cloud-account.css";
import "./theme-refresh.css";
import { FoodDefsHost } from "@/components/food-art";
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
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={kitchenFont.variable}><body><FoodDefsHost />{children}</body></html>;
}
