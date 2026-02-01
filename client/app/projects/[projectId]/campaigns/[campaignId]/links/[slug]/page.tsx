'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import * as api from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function LinkAnalyticsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const campaignId = params.campaignId as string;
  const slug = params.slug as string;

  const [analytics, setAnalytics] = useState({
    countries: [] as { country: string; count: number }[],
    devices: { mobile: 0, tablet: 0, desktop: 0 },
    recentActivity: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [projectId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [countries, devices, activity] = await Promise.all([
        api.getGlobalReach(projectId),
        api.getDeviceBreakdown(projectId),
        api.getRecentActivity(projectId),
      ]);

      setAnalytics({
        countries: countries.data.slice(0, 10),
        devices,
        recentActivity: activity.data.slice(0, 20),
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const blob = await api.downloadClicks(projectId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clicks-${projectId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export:', err);
    }
  };

  const clicksOverTime = analytics.recentActivity.map((click, index) => ({
    index: index + 1,
    clicks: 1,
    date: new Date(click.clickedAt).toLocaleDateString(),
  }));

  if (loading) {
    return (
      <div className="content-wrapper">
        <div className="flex items-center justify-center min-h-[60vh]">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Link Analytics</h1>
            <p className="text-base-content opacity-70 mt-2">
              Detailed performance metrics for /{slug}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('json')}
              className="btn btn-outline gap-2"
            >
              <Download size={18} />
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="btn btn-outline gap-2"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Clicks Over Time Chart */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Recent Activity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={clicksOverTime}>
              <XAxis dataKey="index" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="clicks" stroke="#0ea5e9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Top Countries</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Country</th>
                    <th className="text-right">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.countries.map((country, index) => (
                    <tr key={index}>
                      <td>{country.country || 'Unknown'}</td>
                      <td className="text-right font-semibold">
                        {country.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Device Types</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Mobile</span>
                  <span className="font-semibold">
                    {analytics.devices.mobile.toLocaleString()}
                  </span>
                </div>
                <progress
                  className="progress progress-primary"
                  value={analytics.devices.mobile}
                  max={
                    analytics.devices.mobile +
                    analytics.devices.tablet +
                    analytics.devices.desktop
                  }
                ></progress>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Tablet</span>
                  <span className="font-semibold">
                    {analytics.devices.tablet.toLocaleString()}
                  </span>
                </div>
                <progress
                  className="progress progress-secondary"
                  value={analytics.devices.tablet}
                  max={
                    analytics.devices.mobile +
                    analytics.devices.tablet +
                    analytics.devices.desktop
                  }
                ></progress>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Desktop</span>
                  <span className="font-semibold">
                    {analytics.devices.desktop.toLocaleString()}
                  </span>
                </div>
                <progress
                  className="progress progress-accent"
                  value={analytics.devices.desktop}
                  max={
                    analytics.devices.mobile +
                    analytics.devices.tablet +
                    analytics.devices.desktop
                  }
                ></progress>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Clicks */}
        <div className="card bg-base-100 shadow-xl lg:col-span-2">
          <div className="card-body">
            <h2 className="card-title">Recent Clicks</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm table-zebra">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Country</th>
                    <th>Device</th>
                    <th>Browser</th>
                    <th>OS</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentActivity.map((click, index) => (
                    <tr key={index}>
                      <td>{new Date(click.clickedAt).toLocaleString()}</td>
                      <td>{click.geo?.country || 'Unknown'}</td>
                      <td>
                        <span className="badge badge-sm">
                          {click.device?.type || 'Unknown'}
                        </span>
                      </td>
                      <td>{click.browser?.name || 'Unknown'}</td>
                      <td>{click.os?.name || 'Unknown'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}