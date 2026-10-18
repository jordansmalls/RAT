"use client";

import { useUser } from "@/features/auth/queries";
import { useSocialCounts, useRefreshSocialCounts } from "../queries";
import type { SocialCounts as Counts } from "../schemas";
import styles from "@/features/dashboard/components/dashboard.module.css";
import { Button } from "@/components/ui/button";
const labels = {
  youtube: "YouTube",
  instagram: "Instagram",
  twitter: "Twitter / X",
  twitch: "Twitch",
};
export function SocialCounts() {
  const user = useUser();
  const counts = useSocialCounts(),
    refresh = useRefreshSocialCounts();
  const profiles =
    counts.data?.profiles ??
    (Object.entries(user.socials)
      .filter(([, profile]) => profile.identifier)
      .map(([platform, profile]) => ({ ...profile, platform })) as Counts["profiles"]);
  // Background polling stays quiet; only the first load and a manual refresh show progress.
  const busy = counts.isPending || refresh.isPending;
  const error =
    counts.isError || refresh.isError ? "Could not refresh audience counts. Any saved counts are shown below." : "";
  return (
    <section className="mb-10 space-y-4" aria-labelledby="audience-heading" aria-busy={busy}>
      <div className="flex items-center justify-between gap-4">
        <h2 id="audience-heading" className="type-section-title">
          Your audience
        </h2>
        <Button variant="outline" disabled={busy} onClick={() => refresh.mutate()}>
          {busy ? "Refreshing…" : "Refresh counts"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {profiles.map((profile) => (
          <article key={profile.platform} className={styles.analyticsCard}>
            <h3 className="font-medium">{labels[profile.platform]}</h3>
            <p className="truncate text-sm text-muted-foreground" title={profile.identifier}>
              {profile.displayName || profile.identifier}
            </p>
            <p className="mt-3 text-lg font-semibold tabular-nums">
              {profile.count === null
                ? "Unavailable"
                : `${profile.approximate ? "≈ " : ""}${profile.count.toLocaleString()}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {profile.platform === "youtube" ? "Subscribers" : "Followers"}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {profile.syncedAt ? `Updated ${new Date(profile.syncedAt).toLocaleString()}` : "No count fetched yet"}
            </p>
            {profile.lastError && (
              <p className="mt-2 text-xs text-muted-foreground">
                {profile.lastError}
                {profile.count !== null ? " Showing the last saved count." : ""}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
