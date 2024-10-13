import Link from "next/link";
import styles from "@/app/styles/Footer.module.css";

interface Settings {
  [key: string]: any;
}

const Footer = async ({ settings }: Settings) => {
  return (
    <footer className={styles.footer}>
      <div className={styles.links}>
        <div className="footer-section">
          <h4>Links</h4>
          <ul>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/guestbook">Guestbook</Link>
            </li>
            <li>
              <Link href="/blog">Blog</Link>
            </li>
            <li>
              <Link href="/snippets">Snippets</Link>
            </li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Connect</h4>
          <ul>
            {settings?.twitterLink && (
              <li>
                <a
                  href={settings.twitterLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Twitter
                </a>
              </li>
            )}
            {settings?.githubLink && (
              <li>
                <a
                  href={settings.githubLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
            )}
            {settings?.linkedinLink && (
              <li>
                <a
                  href={settings.linkedinLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className={styles.bottomText}>
        <p>
          &copy; {new Date().getFullYear()} Theodor Badescu. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
