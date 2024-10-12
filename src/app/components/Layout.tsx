import Header from "./Header";
import Footer from "./Footer";
import { UserProvider } from "@/app/contexts/UserContext";

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
    <div className="layout">
      <UserProvider initialUser={initialUser}>
        <Header />
        <main>{children}</main>
        <Footer />
      </UserProvider>
    </div>
  );
}
