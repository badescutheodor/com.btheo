import "normalize.css";
import "@/app/styles/theme.css";
import "@/app/styles/global.css";
import Layout from "@/app/components/Layout";
import { getCurrentUser, getSettings } from "@/lib/utils";
import { Inter, Poppins } from "next/font/google";
import { ThemeProvider } from "next-themes";
import BackgroundTransition from "./components/BodyTransition";
import { SettingsProvider } from "./contexts/SettingsContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);

  return (
    <html
      lang="en"
      className={`${inter.className} ${poppins.className}`}
      suppressHydrationWarning
    >
      <body>
        <SettingsProvider initialSettings={settings}>
          <ThemeProvider>
            <Layout initialUser={user} initialSettings={settings}>
              <BackgroundTransition />
              {children}
            </Layout>
          </ThemeProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
