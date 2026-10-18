import { redirect } from "next/navigation";

// The old app called this step "handle".
export default function Page() {
  redirect("/onboarding/username");
}
