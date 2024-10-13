import Header from "./Header";
import Footer from "./Footer";
import { UserProvider } from "@/app/contexts/UserContext";
import AdminMenu from "./AdminMenu";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export default function Layout({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: User | null;
}) {
  return (
    <div className="layout container">
      <UserProvider initialUser={initialUser}>
        <AdminMenu />
        <div className={"page-content"}>
          <Header />
          {children}
          <Footer />
        </div>
      </UserProvider>
    </div>
  );
}
