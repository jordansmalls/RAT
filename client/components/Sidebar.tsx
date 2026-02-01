'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Moon, Sun, Plus, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import { useProjectStore } from '@/stores/useProjectStore';

export default function Sidebar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const { projects, campaigns, fetchProjects, fetchCampaigns } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const toggleProject = async (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
      await fetchCampaigns(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const projectCampaigns = (projectId: string) =>
    campaigns.filter(c => c.project === projectId);

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn btn-circle btn-primary"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-72 bg-base-200 border-r border-base-300 z-40 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-base-300">
            <div className="flex items-center justify-between mb-4">
              <Link href="/" className="flex items-center gap-2 group">
                {/* <BarChart3 size={28} className="text-primary" /> */}
                <span className="text-xl font-bold ">
                  Rich Analytics
                </span>
              </Link>
              <button
                onClick={toggleTheme}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              <Link
                href="/"
                className={`btn btn-ghost w-full justify-start gap-2 ${
                  pathname === '/' ? 'bg-primary text-primary-content' : ''
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                All Projects
              </Link>

              {projects.length > 0 && (
                <div className="mt-6">
                  <div className="px-3 mb-2 text-xs font-semibold text-base-content opacity-60 uppercase tracking-wider">
                    Projects
                  </div>
                  <div className="space-y-1">
                    {projects.map((project) => (
                      <div key={project._id}>
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleProject(project._id)}
                            className="btn btn-ghost btn-sm btn-square"
                          >
                            {expandedProjects.has(project._id) ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </button>
                          <Link
                            href={`/projects/${project._id}`}
                            className={`flex-1 btn btn-ghost btn-sm justify-start truncate ${
                              pathname.startsWith(`/projects/${project._id}`) && !pathname.includes('/campaigns/')
                                ? 'bg-primary text-primary-content'
                                : ''
                            }`}
                            onClick={() => setSidebarOpen(false)}
                          >
                            {project.clientName}
                          </Link>
                        </div>

                        {expandedProjects.has(project._id) && (
                          <div className="ml-8 mt-1 space-y-1">
                            {projectCampaigns(project._id).map((campaign) => (
                              <Link
                                key={campaign._id}
                                href={`/projects/${project._id}/campaigns/${campaign._id}`}
                                className={`btn btn-ghost btn-sm w-full justify-start text-xs truncate ${
                                  pathname.includes(campaign._id)
                                    ? 'bg-secondary text-secondary-content'
                                    : ''
                                }`}
                                onClick={() => setSidebarOpen(false)}
                              >
                                {campaign.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-base-300">
            <Link
              href="/projects/new"
              className="btn btn-primary w-full gap-2"
              onClick={() => setSidebarOpen(false)}
            >
              <Plus size={18} />
              New Project
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}