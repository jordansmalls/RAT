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
import { Textarea } from "../ui/textarea"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useProjectStore } from "@/stores/useProjectStore"
import Link from "next/link"
import { toast } from "sonner"

export function CreateProjectForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { createProject, loading } = useProjectStore()
  const [formData, setFormData] = useState({
    clientName: "",
    description: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.clientName.trim()) {
      toast.error("Oops! You forgot something.", {
        description: "A name is required for your new project.",
      })
      return
    }

    try {
      const project = await createProject(formData)
      router.push(`/projects/${project._id}`)
    } catch (err) {
      toast.error("Oops! Something went wrong.", {
        description:
          "We're having trouble creating the project, please try again.",
      })
      console.error(err)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Create New Project</CardTitle>
          <CardDescription className="text-center">
            Start tracking links for a new client or campaign.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="projectName">Project Name</FieldLabel>
                <Input
                  id="projectName"
                  type="text"
                  placeholder="e.g., Acme Corp Marketing"
                  required
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                </div>
                <Textarea
                  id="description"
                  placeholder="Brief description of this project..."
                  className="h-24 resize-none"
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Project"
                  )}
                </Button>

                <Button
                  variant="outline"
                  render={<Link href={"/"} />}
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
