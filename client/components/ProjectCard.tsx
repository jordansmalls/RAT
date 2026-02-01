'use client';

import Link from 'next/link';
import { Trash2, Calendar, ExternalLink } from 'lucide-react';
import type { Project } from '@/lib/types';

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm(`Delete project "${project.clientName}"? This action cannot be undone.`)) {
      onDelete(project._id);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <h2 className="card-title text-2xl font-bold">{project.clientName}</h2>
          <button
            onClick={handleDelete}
            className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error hover:text-error-content"
            aria-label="Delete project"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <p className="text-base-content opacity-70 min-h-[3rem]">
          {project.description || 'No description provided'}
        </p>

        <div className="flex items-center gap-2 text-sm text-base-content opacity-60 mt-2">
          <Calendar size={14} />
          <span>Created {formatDate(project.createdAt)}</span>
        </div>

        <div className="card-actions justify-end mt-4">
          <Link
            href={`/projects/${project._id}`}
            className="btn btn-primary btn-sm gap-2"
          >
            View Details
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}