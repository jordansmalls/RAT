import { redirect } from "next/navigation";

export default function Page() {
  redirect("/dashboard?view=projects&create=project");
}
