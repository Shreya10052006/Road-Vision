import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { CameraProvider } from "@/contexts/CameraContext";

export const metadata: Metadata = {
  title: "RoadVision — Smart Road Monitoring",
  description:
    "Intelligent Road Damage Assessment and Maintenance Prioritization using Computer Vision and Machine Learning.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body className="min-h-screen bg-app-bg">
        <ThemeProvider>
          <ToastProvider>
            <CameraProvider>{children}</CameraProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
