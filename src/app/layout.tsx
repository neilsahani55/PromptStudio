import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";

// Raise the serverless function timeout for all routes under this layout so
// vision-heavy flows (screenshot analysis) don't get killed at 10 s.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'PromptStudio',
  description: 'Turn blog posts, screenshots, or any image into engaging, social-media-ready visuals with the power of AI.',
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
  (function() {
    try {
      var valid = ['light','dark','ocean-blue','forest-green','sunset','rose','midnight','lavender','charcoal','emerald'];
      var darkFeel = ['dark','forest-green','midnight','charcoal'];
      var stored = localStorage.getItem('theme');
      var theme = valid.indexOf(stored) >= 0 ? stored : 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      if (darkFeel.indexOf(theme) >= 0) {
        document.documentElement.classList.add('dark');
      }
    } catch(e) {}
  })();
` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
