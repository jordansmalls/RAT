"use client";

import { SettingsSection } from "@/components/settings-section";
import { DeleteAccountForm } from "@/features/account/components/delete-account-form";
import { PasswordForm } from "@/features/account/components/password-form";
import { ProfileForm } from "@/features/account/components/profile-form";
import { UsernameForm } from "@/features/account/components/username-form";
import { useUser } from "@/features/auth/queries";

export function AccountSettings() {
  const user = useUser();

  return (
    <div className="grid max-w-2xl gap-6">
      <SettingsSection title="Profile" description="Your name and email address.">
        <ProfileForm user={user} />
      </SettingsSection>
      <SettingsSection title="Username" description="Your unique handle.">
        <UsernameForm currentUsername={user.username} />
      </SettingsSection>
      <SettingsSection title="Password" description="Changing your password signs out your other sessions.">
        <PasswordForm />
      </SettingsSection>
      <SettingsSection
        title="Delete account"
        description="Permanently delete your account and all of its data. This cannot be undone."
        className="border-destructive/40"
      >
        <DeleteAccountForm />
      </SettingsSection>
    </div>
  );
}
