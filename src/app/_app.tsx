import "reflect-metadata";
import type { AppProps } from "next/app";
import "@/app/styles/index.css";

async function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default App;
