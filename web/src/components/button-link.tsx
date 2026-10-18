import Link from "next/link";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type ButtonLinkProps = Omit<ComponentProps<typeof Button>, "render" | "nativeButton"> & {
  href: ComponentProps<typeof Link>["href"];
};

/**
 * A Next.js link styled as a button.
 */
export function ButtonLink({ href, ...props }: ButtonLinkProps) {
  return <Button nativeButton={false} render={<Link href={href} />} {...props} />;
}
