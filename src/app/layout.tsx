import "normalize.css";
import "@/app/styles/global.css";
import Layout from "@/app/components/Layout";
import { getCurrentUser } from "@/lib/utils";
import { Inter, Poppins } from "next/font/google";
import { ThemeProvider } from "next-themes";
import BackgroundTransition from "./components/BodyTransition";

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
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${inter.className} ${poppins.className}`}>
      <body>
        <ThemeProvider>
          <Layout initialUser={user}>
            <BackgroundTransition />
            <main>{children}</main>
          </Layout>
        </ThemeProvider>
      </body>
    </html>
  );
}
