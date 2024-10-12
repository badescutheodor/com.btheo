import Layout from "@/app/components/Layout";
import { getCurrentUser } from "@/lib/utils";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <Layout initialUser={user}>
          <main>{children}</main>
        </Layout>
      </body>
    </html>
  );
}
