import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import Head from "next/head";
import { Sidenav } from "~/components/Sidenav";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <Head> 
            <title>Su Media</title>
            <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="container mx-auto flex items-start sm:pr-4">

      <Sidenav />
      <div className="min-h-screen flex-grow border-x">
      <Component {...pageProps} />
      </div>
      </div>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
