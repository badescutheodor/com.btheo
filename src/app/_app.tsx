import type { AppProps } from "next/app";

if (typeof window !== "undefined") {
  alert("Hello, world!");
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.body.classList.add("dark");
  }
}

async function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default App;
