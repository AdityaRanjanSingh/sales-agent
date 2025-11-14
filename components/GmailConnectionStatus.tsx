"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle, CheckCircle } from "lucide-react";

/**
 * Component to display Gmail connection status and provide connection button
 * Shows whether the user has connected their Google account for Gmail integration
 */
export function GmailConnectionStatus() {
  const { user, isLoaded } = useUser();
  const [isGmailConnected, setIsGmailConnected] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      // Check if user has a verified Google account
      // Note: TypeScript types say "google" but Clerk actually returns "oauth_google" at runtime
      const googleAccount = user.externalAccounts.find(
        (account) => (account.provider === "google" || (account.provider as string) === "oauth_google") &&
          account.verification?.status === "verified"
      );
      setIsGmailConnected(!!googleAccount);
    }
  }, [user, isLoaded]);

  if (!isLoaded) {
    return null;
  }

  const handleConnectGmail = () => {
    // Open Clerk's account management to connect Google
    // This uses Clerk's built-in account connection flow
    window.open('/user-profile#/security', '_blank');
  };

  if (isGmailConnected) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Gmail Connected</AlertTitle>
        <AlertDescription className="text-green-700">
          Your Google account is connected and ready to use with the sales assistant.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-yellow-50 border-yellow-200">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Gmail Not Connected</AlertTitle>
      <AlertDescription className="text-yellow-700 flex flex-col gap-3">
        <p>
          To use the sales assistant with Gmail tools, you need to connect your Google account.
        </p>
        <Button
          onClick={handleConnectGmail}
          variant="outline"
          className="w-fit border-yellow-300 hover:bg-yellow-100"
        >
          <Mail className="mr-2 h-4 w-4" />
          Connect Google Account
        </Button>
      </AlertDescription>
    </Alert>
  );
}
