import LoginForm from "@/app/components/LoginForm";
import styles from "@/app/styles/LoginPage.module.css";

export default function LoginPage() {
  return (
    <div className={styles.loginPage}>
      <h2>Sign In</h2>
      <p>Sign in to access your account</p>
      <LoginForm />
    </div>
  );
}
