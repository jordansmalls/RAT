"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { ButtonLink } from "@/components/button-link";
import { FullPageSpinner } from "@/components/full-page-spinner";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { routes } from "@/lib/routes";
import { useMe, useResendVerificationEmail, useVerifyEmail } from "../queries";

/**
 * Landing page for the link in the verification email. Works whether or not
 * the user is signed in on this device. Render inside a <Suspense> boundary.
 */
export function VerifyEmail() {
  const { id, hash } = useParams<{ id: string; hash: string }>();
  const searchParams = useSearchParams();
  const verify = useVerifyEmail();
  const resend = useResendVerificationEmail();
  const { data: user } = useMe();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    verify.mutate({ id, hash, signedQuery: searchParams.toString() });
  }, [id, hash, searchParams, verify]);

  const continueHref = user ? routes.dashboard : routes.login;

  if (verify.isSuccess) {
    return (
      <AuthCard title="Email verified" description={verify.data.message}>
        <ButtonLink href={continueHref} className="w-full">
          Continue
        </ButtonLink>
      </AuthCard>
    );
  }

  if (verify.isError) {
    return (
      <AuthCard
        title="Link invalid or expired"
        description={errorMessage(verify.error, "We couldn't verify your email with this link.")}
      >
        {user && !user.email_verified_at ? (
          resend.isSuccess ? (
            <p className="text-sm text-muted-foreground">{resend.data.message}</p>
          ) : (
            <Button className="w-full" onClick={() => resend.mutate()} disabled={resend.isPending}>
              Send a new verification link
            </Button>
          )
        ) : (
          <ButtonLink href={continueHref} variant="outline" className="w-full">
            Continue
          </ButtonLink>
        )}
      </AuthCard>
    );
  }

  return <FullPageSpinner />;
}
