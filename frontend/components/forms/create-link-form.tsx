"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useProjectStore } from "@/stores/useProjectStore"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function CreateLinkForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

    const params = useParams()
    const router = useRouter()
    const projectId = params.projectId as string
    const campaignId = params.campaignId as string

    const { createLink, loading } = useProjectStore()
    const [title, setTitle] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      if (!title.trim()) {
        toast.error("Oops! You forgot something.", { description: "A title for your link is required for creation."})
        return
      }

      try {
        await createLink({
          project_id: projectId,
          campaign_id: campaignId,
          title,
        })
        router.push(`/projects/${projectId}/campaigns/${campaignId}`)
      } catch (err) {
        toast.error("Oops! Something went wrong.", { description: "We're having trouble creating the link, please try again soon."})
        console.error(err)
      }
    }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Add Manual Link</CardTitle>
          <CardDescription className="text-center">
            Create a custom tracking link for this campaign.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="title">Link Title</FieldLabel>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g., Instagram Story Link"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <p className="text-[0.8rem] text-muted-foreground text-center">
                  A descriptive name to identify this tracking link.
                </p>
              </Field>
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Link"
                  )}
                </Button>
                <Button variant="outline" type="button">
                  <Link href={`/projects/${projectId}/campaigns/${campaignId}`} className="w-full">
                    Cancel
                  </Link>
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
