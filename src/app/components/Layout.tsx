import Header from "./Header";
import Footer from "./Footer";
import { UserProvider } from "@/app/contexts/UserContext";
import AdminMenu from "./AdminMenu";
import styles from "@/app/styles/Layout.module.css";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface Settings {
  [key: string]: any;
}

export default function Layout({
  children,
  initialUser,
  initialSettings,
}: {
  children: React.ReactNode;
  initialUser: User | null;
  initialSettings: Settings;
}) {
  return (
    <div className="layout container">
      <UserProvider initialUser={initialUser}>
        <AdminMenu />
        <div className={`${styles.pageContainer} page-content`}>
          <div className={styles.contentWrapper}>
            <Header />
            <main className={styles.mainContent}>{children}</main>
          </div>
          <Footer settings={initialSettings} />
        </div>
      </UserProvider>
    </div>
  );
}
