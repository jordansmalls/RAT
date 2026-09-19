export const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  twitter: "Twitter",
  instagram: "Instagram",
  facebook: "Facebook",
  threads: "Threads",
  reddit: "Reddit",
  linkedin: "LinkedIn",
  twitch: "Twitch",
  pinterest: "Pinterest",
  other: "Custom",
}

export function platformName(platform: string) {
  const key = platform?.trim().toLowerCase()
  return Object.hasOwn(PLATFORM_LABELS, key)
    ? PLATFORM_LABELS[key]
    : platform || "Custom"
}
