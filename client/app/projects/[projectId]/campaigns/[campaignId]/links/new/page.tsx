'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useProjectStore } from '@/stores/useProjectStore';

export default function NewLinkPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const campaignId = params.campaignId as string;

  const { createLink, loading } = useProjectStore();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Link title is required');
      return;
    }

    try {
      await createLink({
        project_id: projectId,
        campaign_id: campaignId,
        title,
      });
      router.push(`/projects/${projectId}/campaigns/${campaignId}`);
    } catch (err) {
      setError('Failed to create link. Please try again.');
      console.error(err);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="mb-8">
        <Link
          href={`/projects/${projectId}/campaigns/${campaignId}`}
          className="btn btn-ghost gap-2 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Campaign
        </Link>
        <h1 className="text-4xl font-bold tracking-[-0.10rem]">Add Manual Link</h1>
        <p className="text-base-content opacity-70 mt-2">
          Create a custom tracking link for this campaign
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
                  <span className="label-text font-semibold">Link Title *</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Instagram Story Link"
                  className="input input-bordered"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <label className="label">
                  <span className="label-text-alt">
                    A descriptive name to identify this tracking link
                  </span>
                </label>
              </div>

              <div className="card-actions justify-end pt-4">
                <Link
                  href={`/projects/${projectId}/campaigns/${campaignId}`}
                  className="btn btn-ghost"
                >
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
                    'Create Link'
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