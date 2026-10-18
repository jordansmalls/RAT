"use client";

import { MailIcon } from "@/components/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useResendVerificationEmail, useUser } from "@/features/auth/queries";
import { errorMessage } from "@/lib/api";

export function EmailVerificationBanner() {
  const user = useUser();
  const resend = useResendVerificationEmail();

  if (user.email_verified_at) return null;

  const onResend = () =>
    resend.mutate(undefined, {
      onSuccess: ({ message }) => toast.success(message),
      onError: (error) => toast.error(errorMessage(error)),
    });

  return (
    <div className="border-b bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
        <MailIcon className="size-4 shrink-0" />
        <span>
          Please verify <strong className="font-medium">{user.email}</strong>. Check your inbox for the link.
        </span>
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0 text-current underline"
          onClick={onResend}
          disabled={resend.isPending || resend.isSuccess}
        >
          {resend.isSuccess ? "Sent" : "Resend email"}
        </Button>
      </div>
    </div>
  );
}
