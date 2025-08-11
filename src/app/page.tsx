"use client"

import AuthSection from "@/components/auth-section";
import EmailList from "@/components/email-list";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="h-screen">
        <EmailList />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <AuthSection />
    </div>
  );
}
