"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useProjectStore } from "@/stores/useProjectStore";

export default function NewProjectPage() {
  const router = useRouter();
  const { createProject, loading } = useProjectStore();
  const [formData, setFormData] = useState({
    clientName: "",
    description: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.clientName.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      await createProject(formData);
      router.push("/");
    } catch (err) {
      setError("Failed to create project. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="mb-8">
        <Link href="/" className="btn btn-ghost gap-2 mb-4">
          <ArrowLeft size={20} />
          Back to Projects
        </Link>
        <h1 className="text-4xl font-bold tracking-[-0.10rem]">
          Create New Project
        </h1>
        <p className="text-base-content opacity-70 mt-2">
          Start tracking links for a new client or campaign
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="alert alert-error">
                  <span>{error}</span>
                </div>
              )}

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">
                    Project Name *
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Acme Corp Marketing"
                  className="input input-bordered"
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Description</span>
                </label>
                <textarea
                  placeholder="Brief description of this project..."
                  className="textarea textarea-bordered h-24"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="card-actions justify-end pt-4">
                <Link href="/" className="btn btn-ghost">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Creating...
                    </>
                  ) : (
                    "Create Project"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
