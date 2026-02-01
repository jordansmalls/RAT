"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Edit } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import CampaignCard from "@/components/CampaignCard";
import * as api from "@/lib/api";
import type { Campaign } from "@/lib/types";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [activeTab, setActiveTab] = useState<"campaigns" | "analytics">(
    "campaigns",
  );
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editFormData, setEditFormData] = useState({ title: "", url: "" });

  const { campaigns, fetchCampaigns, updateCampaign, deleteCampaign, loading } =
    useProjectStore();

  // Analytics data
  const [analytics, setAnalytics] = useState({
    totalClicks: 0,
    humanConfidence: 0,
    devices: { mobile: 0, tablet: 0, desktop: 0 },
    countries: [] as { country: string; count: number }[],
  });

  useEffect(() => {
    if (projectId) {
      fetchCampaigns(projectId);
      loadAnalytics();
    }
  }, [projectId, fetchCampaigns]);

  const loadAnalytics = async () => {
    try {
      const [confidence, devices, countries] = await Promise.all([
        api.getHumanConfidence(projectId),
        api.getDeviceBreakdown(projectId),
        api.getGlobalReach(projectId),
      ]);

      const totalClicks = devices.mobile + devices.tablet + devices.desktop;

      setAnalytics({
        totalClicks,
        humanConfidence: confidence.confidence,
        devices,
        countries: countries.data.slice(0, 5),
      });
    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditFormData({ title: campaign.title, url: campaign.url });
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    try {
      await updateCampaign(editingCampaign._id, editFormData);
      setEditingCampaign(null);
      fetchCampaigns(projectId);
    } catch (err) {
      console.error("Failed to update campaign:", err);
    }
  };

  const deviceChartData = [
    { name: "Mobile", value: analytics.devices.mobile, color: "#0ea5e9" },
    { name: "Tablet", value: analytics.devices.tablet, color: "#8b5cf6" },
    { name: "Desktop", value: analytics.devices.desktop, color: "#10b981" },
  ];

  return (
    <div className="content-wrapper">
      <div className="mb-8">
        <Link href="/" className="btn btn-ghost gap-2 mb-4">
          <ArrowLeft size={20} />
          Back to Projects
        </Link>
        <h1 className="text-4xl font-bold tracking-[-0.10rem]">
          Project Details
        </h1>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-6 bg-base-200 p-1">
        <a
          className={`tab ${activeTab === "campaigns" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("campaigns")}
        >
          Campaigns
        </a>
        <a
          className={`tab ${activeTab === "analytics" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          Analytics
        </a>
      </div>

      {activeTab === "campaigns" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Campaigns</h2>
            <Link
              href={`/projects/${projectId}/campaigns/new`}
              className="btn btn-primary gap-2"
            >
              <Plus size={20} />
              New Campaign
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body items-center text-center py-16">
                <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
                <p className="text-base-content opacity-70 mb-4">
                  Create your first campaign to start tracking links
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>URL</th>
                    <th>Links</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign._id}
                      campaign={campaign}
                      projectId={projectId}
                      linkCount={0}
                      onEdit={handleEdit}
                      onDelete={deleteCampaign}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "analytics" && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Analytics Overview</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="stats shadow">
              <div className="stat">
                <div className="stat-title">Total Clicks</div>
                <div className="stat-value text-primary">
                  {analytics.totalClicks.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="stats shadow">
              <div className="stat">
                <div className="stat-title">Human Confidence</div>
                <div className="stat-value text-secondary">
                  {(analytics.humanConfidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">Device Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={deviceChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label
                    >
                      {deviceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">Top Countries</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.countries}>
                    <XAxis dataKey="country" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCampaign && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Edit Campaign</h3>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Title</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={editFormData.title}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">URL</span>
                </label>
                <input
                  type="url"
                  className="input input-bordered"
                  value={editFormData.url}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, url: e.target.value })
                  }
                  required
                />
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingCampaign(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
