'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useProjectStore } from '@/stores/useProjectStore';

export default function NewCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { createCampaign, loading } = useProjectStore();

  const [formData, setFormData] = useState({
    title: '',
    url: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim() || !formData.url.trim()) {
      setError('All fields are required');
      return;
    }

    try {
      await createCampaign({
        project_id: projectId,
        title: formData.title,
        url: formData.url,
      });
      router.push(`/projects/${projectId}`);
    } catch (err) {
      setError('Failed to create campaign. Please try again.');
      console.error(err);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="mb-8">
        <Link href={`/projects/${projectId}`} className="btn btn-ghost gap-2 mb-4">
          <ArrowLeft size={20} />
          Back to Project
        </Link>
        <h1 className="text-4xl font-bold">Create New Campaign</h1>
        <p className="text-base-content opacity-70 mt-2">
          Add a new campaign with tracking links
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
                  <span className="label-text font-semibold">Campaign Title *</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Summer Sale 2024"
                  className="input input-bordered"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Campaign URL *</span>
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/campaign"
                  className="input input-bordered"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  required
                />
                <label className="label">
                  <span className="label-text-alt">
                    This will be used to generate tracking links for different platforms
                  </span>
                </label>
              </div>

              <div className="card-actions justify-end pt-4">
                <Link href={`/projects/${projectId}`} className="btn btn-ghost">
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
                    'Create Campaign'
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