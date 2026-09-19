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
import { Loader2 } from "lucide-react"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useProjectStore } from "@/stores/useProjectStore"
import Link from "next/link"
import { toast } from "sonner"

export function CreateCampaignForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const { createCampaign, loading } = useProjectStore()

  const [formData, setFormData] = useState({
    title: "",
    url: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.url.trim()) {
      toast.error("Oops! Something went wrong.", {
        description: "All fields are required to create a new campaign.",
      })
      return
    }

    try {
      const campaign = await createCampaign({
        project_id: projectId,
        title: formData.title,
        url: formData.url,
      })
      router.push(`/projects/${projectId}/campaigns/${campaign._id}`)
    } catch (err) {
      toast.error("Oops! Something went wrong.", {
        description:
          "There was an error attempting to create the campaign. Please try again.",
      })
      console.error(err)
    }
  }
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Create New Campaign</CardTitle>
          <CardDescription className="text-center">
            Add a new campaign with tracking links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="title">Campaign Title</FieldLabel>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g., Summer Sale 2024"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="description">Campaign URL</FieldLabel>
                </div>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/campaign"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  required
                />
                <p className="text-center text-[0.8rem] text-muted-foreground">
                  This will be used to generate tracking links for different
                  platforms.
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
                    "Create Campaign"
                  )}
                </Button>
                <Button
                  variant="outline"
                  render={<Link href={`/projects/${projectId}`} />}
                  nativeButton={false}
                >
                  Cancel
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
