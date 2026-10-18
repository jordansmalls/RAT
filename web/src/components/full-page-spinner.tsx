import { Spinner } from "@/components/ui/spinner";

export function FullPageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center p-12">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
