import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>DFU Predict</title>
        <meta
          name="description"
          content="DFU Predict – AI-assisted triage for diabetic foot ulcers."
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}