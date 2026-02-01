'use client';

import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useProjectStore } from '@/stores/useProjectStore';
import ProjectCard from '@/components/ProjectCard';

export default function HomePage() {
  const { projects, loading, fetchProjects, deleteProject } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold tracking-[-0.10rem]">Projects</h1>
          <Link href="/projects/new" className="btn btn-primary gap-2">
            <Plus size={20} />
            New Project
          </Link>
        </div>
        <p className="text-base-content opacity-70">
          Manage your link tracking projects
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body items-center text-center py-16">
            <h2 className="text-2xl font-semibold mb-4">No projects yet</h2>
            <p className="text-base-content opacity-70 mb-6 max-w-md">
              Get started by creating your first project to track campaign links and analyze performance.
            </p>
            <Link href="/projects/new" className="btn btn-primary gap-2">
              <Plus size={20} />
              Create Your First Project
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onDelete={deleteProject}
            />
          ))}
        </div>
      )}
    </div>
  );
}