'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit } from 'lucide-react';
import { useProjectStore } from '@/stores/useProjectStore';
import LinkRow from '@/components/LinkRow';
import * as api from '@/lib/api';
import { useState } from 'react';
import type { Campaign } from '@/lib/types';

export default function CampaignDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const campaignId = params.campaignId as string;

  const { links, fetchLinks, loading } = useProjectStore();
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    if (campaignId) {
      fetchLinks(campaignId);
      loadCampaign();
    }
  }, [campaignId, fetchLinks]);

  const loadCampaign = async () => {
    try {
      const data = await api.getCampaign(campaignId);
      setCampaign(data);
    } catch (err) {
      console.error('Failed to load campaign:', err);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="mb-8">
        <Link href={`/projects/${projectId}`} className="btn btn-ghost gap-2 mb-4">
          <ArrowLeft size={20} />
          Back to Project
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-[-0.10rem]">{campaign?.title || 'Campaign'}</h1>
            {campaign?.url && (
              <a
                href={campaign.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary text-sm mt-2"
              >
                {campaign.url}
              </a>
            )}
          </div>
          <button className="btn btn-ghost btn-circle">
            <Edit size={20} />
          </button>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-[-0.05rem]">Tracking Links</h2>
        <Link
          href={`/projects/${projectId}/campaigns/${campaignId}/links/new`}
          className="btn btn-primary gap-2"
        >
          <Plus size={20} />
          Add Manual Link
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : links.length === 0 ? (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body items-center text-center py-16">
            <h3 className="text-xl font-semibold mb-2">No links yet</h3>
            <p className="text-base-content opacity-70 mb-4">
              Add your first tracking link to this campaign
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Title</th>
                <th>Platform</th>
                <th>Slug</th>
                <th>Short URL</th>
                <th>Clicks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <LinkRow
                  key={link._id}
                  link={link}
                  projectId={projectId}
                  campaignId={campaignId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}