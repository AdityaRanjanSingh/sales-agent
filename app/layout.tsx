import "./globals.css";
import type { ReactNode } from "react";
import { Public_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";

const publicSans = Public_Sans({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <title>LangChain + Next.js Template</title>
          <link rel="shortcut icon" href="/images/favicon.ico" />
          <meta
            name="description"
            content="Starter template showing how to use LangChain in Next.js projects. See source code and deploy your own at https://github.com/langchain-ai/langchain-nextjs-template!"
          />
          <meta property="og:title" content="LangChain + Next.js Template" />
          <meta
            property="og:description"
            content="Starter template showing how to use LangChain in Next.js projects. See source code and deploy your own at https://github.com/langchain-ai/langchain-nextjs-template!"
          />
          <meta property="og:image" content="/images/og-image.png" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="LangChain + Next.js Template" />
          <meta
            name="twitter:description"
            content="Starter template showing how to use LangChain in Next.js projects. See source code and deploy your own at https://github.com/langchain-ai/langchain-nextjs-template!"
          />
          <meta name="twitter:image" content="/images/og-image.png" />
        </head>
        <body className={publicSans.className}>
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
