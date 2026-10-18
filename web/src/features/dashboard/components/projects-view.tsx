import { ArrowUpRight, MoreHorizontal } from "@/components/icons";
import type { Campaign, Project } from "@/features/dashboard/types";
import { ProjectAvatar } from "./project-avatar";
import styles from "./dashboard.module.css";

export function ProjectsView({
  projects,
  campaigns,
  query,
  onOpen,
  onManage,
  onCreate,
}: {
  projects: Project[];
  campaigns: Record<string, Campaign[]>;
  query: string;
  onOpen: (id: string) => void;
  onManage: (project: Project) => void;
  onCreate: () => void;
}) {
  const filtered = projects.filter((project) =>
    `${project.clientName} ${project.description}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className={styles.projectsView}>
      <div className={styles.projectTableHead}>
        <span>Project</span>
        <span>Campaigns</span>
        <span>Tracking links</span>
        <span>Created</span>
        <span />
      </div>
      {filtered.map((project) => (
        <div key={project._id} className={styles.projectRow}>
          <button className={styles.projectOpen} onClick={() => onOpen(project._id)}>
            <ProjectAvatar id={project._id} name={project.clientName} />
            <div>
              <h2>{project.clientName}</h2>
              <p>{project.description}</p>
            </div>
            <ArrowUpRight size={14} />
          </button>
          <span className={styles.metadata}>{campaigns[project._id]?.length ?? "…"}</span>
          <span className={styles.metadata}>
            {campaigns[project._id]
              ? campaigns[project._id].reduce((sum, campaign) => sum + (campaign.linkCount ?? 0), 0)
              : "…"}
          </span>
          <time className={styles.metadata} dateTime={project.createdAt}>
            {new Date(project.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </time>
          <button
            className={styles.iconButton}
            aria-label={`Manage ${project.clientName}`}
            onClick={() => onManage(project)}
          >
            <MoreHorizontal />
          </button>
        </div>
      ))}
      {!filtered.length && (
        <div className={styles.emptyState}>
          <h2>{query ? "No matching projects" : "Create your first project"}</h2>
          <p>{query ? "Try another name or description." : "Organize your campaigns and start tracking your links."}</p>
          {!query && (
            <button className={styles.primaryButton} onClick={onCreate}>
              New project
            </button>
          )}
        </div>
      )}
    </div>
  );
}
