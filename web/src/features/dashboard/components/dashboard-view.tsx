"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownUp,
  ChartNoAxesCombined,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Folder,
  LayoutGrid,
  Link2,
  List,
  Menu,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  SettingsIcon,
  LogOutIcon,
} from "@/components/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { useUser, useLogout } from "@/features/auth/queries";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountSettings } from "@/features/account/components/account-settings";
import { EmailVerificationBanner } from "@/components/layout/email-verification-banner";
import { CampaignOverview } from "@/features/dashboard/components/campaign-overview";
import { useProjectStore } from "@/features/dashboard/queries";
import {
  campaignGroups,
  dashboardCampaigns,
  dashboardHref,
  filterCampaigns,
  type DashboardOrdering,
} from "@/features/dashboard/dashboard";
import { ProjectAvatar } from "./project-avatar";
import { ProjectsView } from "./projects-view";
import { AnalyticsView } from "./analytics-view";
import { LinkAnalytics } from "./link-analytics";
import { ManageDrawer } from "./manage-drawer";
import { SocialCounts } from "@/features/socials/components/social-counts";
import type { Project, Campaign } from "@/features/dashboard/types";
import { DashboardCreateDrawer } from "./create-drawer";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import styles from "./dashboard.module.css";

type Property = "ID" | "Project" | "Links" | "Destination" | "Created";
const properties: Property[] = ["ID", "Project", "Links", "Destination", "Created"];

const date = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={onChange}
      className={styles.switch}
    />
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <PopoverContent align="end" sideOffset={8} className={`${styles.theme} ${styles.panel} ${className}`}>
      {children}
    </PopoverContent>
  );
}

// Transitions.dev shared-bubble tooltip: one `.t-tt` per group, every
// trigger carries its label in `data-tooltip`. Hovering/focusing writes
// the bubble's width + x for that trigger — tweened while showing,
// snapped while hidden (appear plays alone). Labels stay in
// `aria-label` too, so the bubble is a visual enhancement only.
function TooltipGroup({
  children,
  side = "above",
  className = "",
}: {
  children: ReactNode;
  side?: "above" | "below";
  className?: string;
}) {
  const groupRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const currentRef = useRef<HTMLElement | null>(null);
  const tipId = useId();

  const place = (trigger: HTMLElement | null) => {
    const group = groupRef.current;
    const tip = tipRef.current;
    const text = textRef.current;
    const measure = measureRef.current;
    if (!group || !tip || !text || !measure || !trigger) return;
    if (!group.contains(trigger)) return;
    const label = trigger.dataset.tooltip;
    if (!label) return;
    if (currentRef.current === trigger && tip.dataset.show === "true") return;
    currentRef.current = trigger;
    trigger.setAttribute("aria-describedby", tipId);
    text.textContent = label;
    measure.textContent = label;
    const width = Math.ceil(measure.offsetWidth);
    const x = Math.round(trigger.offsetLeft + trigger.offsetWidth / 2 - width / 2);
    if (tip.dataset.show !== "true") {
      tip.classList.add("is-snapping");
      tip.style.width = `${width}px`;
      tip.style.setProperty("--tt-x", `${x}px`);
      tip.getBoundingClientRect();
      tip.classList.remove("is-snapping");
    } else {
      tip.style.width = `${width}px`;
      tip.style.setProperty("--tt-x", `${x}px`);
    }
    tip.dataset.show = "true";
  };

  const hide = () => {
    currentRef.current = null;
    const tip = tipRef.current;
    if (tip) tip.dataset.show = "false";
  };

  const triggerFrom = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return null;
    const trigger = target.closest("[data-tooltip]");
    return trigger instanceof HTMLElement ? trigger : null;
  };

  const retargetFrom = (related: EventTarget | null) => (related instanceof HTMLElement ? triggerFrom(related) : null);

  return (
    <span
      ref={groupRef}
      className={`t-tt-group ${className}`}
      data-side={side}
      onMouseOver={(event) => place(triggerFrom(event.target))}
      onMouseOut={(event) => {
        const next = retargetFrom(event.relatedTarget);
        if (next) place(next);
        else hide();
      }}
      onFocusCapture={(event) => place(triggerFrom(event.target))}
      onBlurCapture={(event) => {
        const next = retargetFrom(event.relatedTarget);
        if (next) place(next);
        else hide();
      }}
      onScrollCapture={hide}
      onKeyDown={(event) => {
        if (event.key === "Escape") hide();
      }}
    >
      {children}
      <span ref={tipRef} id={tipId} className="t-tt" role="tooltip" data-show="false">
        <span ref={textRef} className="t-tt-text" />
      </span>
      <span ref={measureRef} className="t-tt-measure" aria-hidden="true" />
    </span>
  );
}

export function DashboardView() {
  const user = useUser();
  const logout = useLogout();
  const params = useSearchParams();
  const projectId = params.get("project") ?? "";
  const selectedId = params.get("campaign") ?? "";
  const linkSlug = params.get("link") ?? "";
  const section =
    params.get("view") === "settings"
      ? "settings"
      : params.get("view") === "projects"
        ? "projects"
        : params.get("view") === "analytics"
          ? "analytics"
          : "campaigns";
  const [lastSelection, setLastSelection] = useState({
    id: selectedId,
    link: linkSlug,
  });
  if (selectedId && (lastSelection.id !== selectedId || lastSelection.link !== linkSlug))
    setLastSelection({ id: selectedId, link: linkSlug });
  const displayedLink = selectedId ? linkSlug : lastSelection.link;
  const [managing, setManaging] = useState<
    { kind: "project"; value: Project } | { kind: "campaign"; value: Campaign } | null
  >(null);
  const {
    projects,
    projectsLoading,
    projectsError,
    campaignsByProject,
    campaignsLoading,
    campaignErrors,
    fetchProjects,
    fetchCampaigns,
  } = useProjectStore();
  const projectsReady = !projectsLoading;

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "board">("list");
  const [grouped, setGrouped] = useState(true);
  const [ordering, setOrdering] = useState<DashboardOrdering>("Created");
  const [ascending, setAscending] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [visible, setVisible] = useState<Property[]>(["Project", "Links", "Created"]);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creating, setCreating] = useState<{
    kind: "project" | "campaign";
    projectId: string;
  } | null>(() =>
    params.get("create") === "project"
      ? { kind: "project", projectId: "" }
      : params.get("create") === "campaign"
        ? { kind: "campaign", projectId }
        : null,
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const focusSearchAfterNavigation = useRef(false);
  useEffect(() => {
    if (section === "campaigns" && focusSearchAfterNavigation.current) {
      focusSearchAfterNavigation.current = false;
      searchRef.current?.focus();
    }
  }, [section]);
  const campaigns = dashboardCampaigns(projects, campaignsByProject);
  const selectedProject = projects.find((project) => project._id === projectId);
  const selected = campaigns.find((campaign) => campaign._id === (selectedId || lastSelection.id));
  const filtered = filterCampaigns(campaigns, projectId, query, ordering, ascending);
  const groups = campaignGroups(projects, filtered, projectId, grouped, showEmpty);
  const relevantProjects = projects.filter((project) => !projectId || project._id === projectId);
  const loading =
    !projectsReady ||
    projectsLoading ||
    relevantProjects.some(
      (project) => campaignsLoading[project._id] || (!campaignsByProject[project._id] && !campaignErrors[project._id]),
    );
  const failedProjects = relevantProjects.filter((project) => campaignErrors[project._id]);
  const unavailableProject =
    projectsReady && !projectsLoading && !projectsError && Boolean(projectId) && !selectedProject;
  const hasFilters = Boolean(query || projectId);
  const navigate = (nextProject = "", campaign = "", nextSection = section, link = "") => {
    window.history.pushState(null, "", dashboardHref(nextProject, campaign, nextSection, link));
    setMobileOpen(false);
  };
  const clearFilters = () => {
    setQuery("");
    navigate();
  };
  const openNew = (initialProject = projectId) => {
    setMobileOpen(false);
    setCreating({
      kind: projects.length ? "campaign" : "project",
      projectId: initialProject,
    });
  };
  const refresh = async () => {
    const latest = (await fetchProjects()) ?? projects;
    await Promise.all(latest.map((project) => fetchCampaigns(project._id)));
  };

  const managementDrawer = managing && (
    <ManageDrawer
      key={`${managing.kind}:${managing.value._id}`}
      entity={managing}
      onClose={() => setManaging(null)}
      onDeleted={() => {
        const kind = managing.kind;
        setManaging(null);
        navigate(kind === "project" ? "" : projectId, "", kind === "project" ? "projects" : "campaigns");
      }}
    />
  );

  return (
    <div className={`${styles.theme} ${styles.window}`}>
      <a className={styles.skipLink} href="#dashboard-content">
        Skip to content
      </a>
      {mobileOpen && (
        <button className={styles.scrim} aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        id="dashboard-navigation"
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}
        aria-label="Workspace navigation"
        onKeyDown={(event) => {
          if (event.key === "Escape") setMobileOpen(false);
        }}
      >
        <div className={styles.workspace}>
          <span className={styles.workspaceName}>Rich Analytics</span>
          <TooltipGroup side="below" className={styles.workspaceActions}>
            <button
              className={styles.iconButton}
              aria-label="Search campaigns"
              data-tooltip="Search campaigns"
              onClick={() => {
                if (section === "campaigns") searchRef.current?.focus();
                else focusSearchAfterNavigation.current = true;
                navigate("", "", "campaigns");
              }}
            >
              <Search />
            </button>
            <button
              className={`${styles.iconButton} ${styles.compose}`}
              aria-label="New campaign"
              data-tooltip="New campaign"
              disabled={!projectsReady || Boolean(projectsError)}
              onClick={() => openNew()}
            >
              <Plus />
            </button>
          </TooltipGroup>
        </div>
        <nav className={styles.navigation}>
          <button
            className={`${styles.navItem} ${!projectId && section === "campaigns" ? styles.navActive : ""}`}
            aria-current={!projectId && section === "campaigns" ? "page" : undefined}
            onClick={() => {
              setQuery("");
              navigate("", "", "campaigns");
            }}
          >
            <LayoutGrid />
            All campaigns
            <span className={styles.navCount}>{campaigns.length}</span>
          </button>
          <button
            className={`${styles.navItem} ${section === "projects" ? styles.navActive : ""}`}
            aria-current={section === "projects" ? "page" : undefined}
            onClick={() => {
              setQuery("");
              navigate("", "", "projects");
            }}
          >
            <Folder />
            Projects<span className={styles.navCount}>{projects.length}</span>
          </button>
          <button
            className={`${styles.navItem} ${section === "analytics" ? styles.navActive : ""}`}
            aria-current={section === "analytics" ? "page" : undefined}
            onClick={() => navigate("", "", "analytics")}
          >
            <ChartNoAxesCombined />
            Analytics
          </button>
          <div className={styles.sectionLabel}>Projects</div>
          {projects.map((project) => (
            <button
              key={project._id}
              className={`${styles.navItem} ${projectId === project._id ? styles.navActive : ""}`}
              aria-current={projectId === project._id ? "page" : undefined}
              onClick={() => {
                setQuery("");
                navigate(project._id, "", "campaigns");
              }}
            >
              <ProjectAvatar id={project._id} name={project.clientName} />
              <span className={styles.navName}>{project.clientName}</span>
              <span className={styles.navCount}>
                {campaignErrors[project._id] ? "!" : (campaignsByProject[project._id]?.length ?? "…")}
              </span>
            </button>
          ))}
          <button
            className={styles.navItem}
            onClick={() => {
              setMobileOpen(false);
              setCreating({ kind: "project", projectId: "" });
            }}
          >
            <Plus />
            New project
          </button>
        </nav>
        <div className={styles.sidebarFooter}>
          <p className={styles.accountName} title={user.email}>
            @{user.username}
          </p>
          <button
            className={`${styles.navItem} ${section === "settings" ? styles.navActive : ""}`}
            aria-current={section === "settings" ? "page" : undefined}
            onClick={() => navigate("", "", "settings")}
          >
            <SettingsIcon />
            Settings
          </button>
          <ThemeToggle className={styles.navItem} />
          <button className={styles.navItem} disabled={logout.isPending} onClick={() => logout.mutate()}>
            <LogOutIcon />
            Sign out
          </button>
        </div>
      </aside>

      <main className={styles.main} id="dashboard-content" tabIndex={-1}>
        <header className={styles.topbar}>
          <button
            className={`${styles.iconButton} ${styles.mobileToggle}`}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            aria-controls="dashboard-navigation"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <Menu />
          </button>
          <div className={styles.breadcrumb}>
            <span>Workspace</span>
            <ChevronRight />
            <h1>
              {section === "settings"
                ? "Settings"
                : section === "projects"
                  ? "Projects"
                  : section === "analytics"
                    ? "Analytics"
                    : (selectedProject?.clientName ?? (projectId ? "Project" : "All campaigns"))}
            </h1>
          </div>
          <div className={styles.headerActions}>
            {section !== "analytics" && (
              <button
                className={styles.iconButton}
                aria-label={section === "projects" ? "Refresh projects" : "Refresh campaigns"}
                disabled={loading}
                onClick={() => void refresh()}
              >
                <RefreshCw size={15} />
              </button>
            )}
            <button
              className={styles.primaryButton}
              disabled={!projectsReady || Boolean(projectsError)}
              onClick={() => (section === "projects" ? setCreating({ kind: "project", projectId: "" }) : openNew())}
            >
              <Plus />
              {section === "projects" || !projects.length ? "New project" : "New campaign"}
            </button>
          </div>
        </header>
        <EmailVerificationBanner />
        {section === "settings" ? (
          <div className={styles.workspaceContent}>
            <AccountSettings />
          </div>
        ) : (
          <>
            <div className={styles.toolbar}>
              <Popover>
                <PopoverTrigger className={`${styles.textButton} ${projectId ? styles.controlActive : ""}`}>
                  <SlidersHorizontal />
                  Filter{projectId && <span className={styles.filterDot} />}
                </PopoverTrigger>
                <Panel>
                  <p className={styles.panelTitle}>Filter by project</p>
                  <label className={styles.panelRow}>
                    Project
                    <NativeSelect size="sm" value={projectId} onChange={(event) => navigate(event.target.value)}>
                      <NativeSelectOption value="">All projects</NativeSelectOption>
                      {projects.map((project) => (
                        <NativeSelectOption key={project._id} value={project._id}>
                          {project.clientName}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                  {hasFilters && (
                    <button className={styles.textButton} onClick={clearFilters}>
                      Clear filters
                    </button>
                  )}
                </Panel>
              </Popover>
              {section !== "analytics" && (
                <div className={styles.search}>
                  <Search />
                  <input
                    ref={searchRef}
                    aria-label={section === "projects" ? "Search projects" : "Search campaigns"}
                    placeholder={section === "projects" ? "Search projects…" : "Search campaigns…"}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query && (
                    <button className={styles.iconButton} aria-label="Clear search" onClick={() => setQuery("")}>
                      <X />
                    </button>
                  )}
                </div>
              )}
              {section === "campaigns" && (
                <div className={styles.displayControl}>
                  <Popover>
                    <PopoverTrigger className={styles.textButton}>
                      <SlidersHorizontal />
                      Display
                    </PopoverTrigger>
                    <Panel>
                      <div className={styles.viewToggle}>
                        {(["list", "board"] as const).map((item) => (
                          <button
                            key={item}
                            aria-pressed={view === item}
                            className={view === item ? styles.viewActive : ""}
                            onClick={() => setView(item)}
                          >
                            {item === "list" ? <List /> : <LayoutGrid />}
                            {item === "list" ? "List" : "Board"}
                          </button>
                        ))}
                      </div>
                      <div className={styles.panelDivider} />
                      <label className={styles.panelRow}>
                        Grouping
                        <NativeSelect
                          size="sm"
                          value={grouped ? "project" : "none"}
                          onChange={(event) => setGrouped(event.target.value === "project")}
                        >
                          <NativeSelectOption value="project">Project</NativeSelectOption>
                          <NativeSelectOption value="none">No grouping</NativeSelectOption>
                        </NativeSelect>
                      </label>
                      <div className={styles.panelRow}>
                        <label htmlFor="dashboard-ordering">Ordering</label>
                        <div className={styles.ordering}>
                          <NativeSelect
                            id="dashboard-ordering"
                            size="sm"
                            value={ordering}
                            onChange={(event) => setOrdering(event.target.value as DashboardOrdering)}
                          >
                            <NativeSelectOption>Created</NativeSelectOption>
                            <NativeSelectOption>Name</NativeSelectOption>
                            <NativeSelectOption>Links</NativeSelectOption>
                          </NativeSelect>
                          <button
                            className={styles.iconButton}
                            aria-label={ascending ? "Sort descending" : "Sort ascending"}
                            onClick={() => setAscending(!ascending)}
                          >
                            <ArrowDownUp />
                          </button>
                        </div>
                      </div>
                      <div className={styles.panelRow}>
                        Show empty projects
                        <Switch
                          label="Show empty projects"
                          checked={showEmpty}
                          onChange={() => setShowEmpty(!showEmpty)}
                        />
                      </div>
                      <div className={styles.panelDivider} />
                      <p className={styles.panelLabel}>Display properties</p>
                      <div className={styles.chips}>
                        {properties.map((property) => (
                          <button
                            key={property}
                            className={styles.chip}
                            aria-pressed={visible.includes(property)}
                            onClick={() =>
                              setVisible((current) =>
                                current.includes(property)
                                  ? current.filter((item) => item !== property)
                                  : [...current, property],
                              )
                            }
                          >
                            {property}
                          </button>
                        ))}
                      </div>
                    </Panel>
                  </Popover>
                </div>
              )}
            </div>
            {section === "campaigns" && hasFilters && (
              <div className={styles.appliedFilters}>
                <span>
                  {filtered.length} {filtered.length === 1 ? "campaign" : "campaigns"}
                  {selectedProject ? ` in ${selectedProject.clientName}` : ""}
                </span>
                <button onClick={clearFilters}>
                  Clear filters
                  <X size={12} />
                </button>
              </div>
            )}
            {projectsError && (
              <div role="alert" className={styles.errorBanner}>
                {projectsError}
                <button onClick={() => void refresh()}>Retry</button>
              </div>
            )}
            {failedProjects.map((project) => (
              <div key={project._id} role="alert" className={styles.errorBanner}>
                Could not load campaigns for {project.clientName}.
                <button onClick={() => void fetchCampaigns(project._id)}>Retry</button>
              </div>
            ))}
            {selectedProject && (
              <div className={styles.contentHeading}>
                <div className={styles.headingIdentity}>
                  <ProjectAvatar id={selectedProject._id} name={selectedProject.clientName} />
                  <div>
                    <h2>{selectedProject.clientName}</h2>
                    <p>{selectedProject.description}</p>
                  </div>
                </div>
                <div className={styles.inlineActions}>
                  <button
                    className={styles.textButton}
                    onClick={() => navigate(projectId, "", section === "analytics" ? "campaigns" : "analytics")}
                  >
                    {section === "analytics" ? "Campaigns" : "Analytics"}
                  </button>
                  <button
                    className={styles.iconButton}
                    aria-label="Manage project"
                    onClick={() => setManaging({ kind: "project", value: selectedProject })}
                  >
                    <MoreHorizontal />
                  </button>
                </div>
              </div>
            )}
            {section === "projects" && (
              <div className={styles.workspaceContent}>
                {projectsLoading && !projects.length ? (
                  <p className={styles.emptyState} role="status">
                    Loading projects…
                  </p>
                ) : (
                  !projectsError && (
                    <ProjectsView
                      projects={relevantProjects}
                      campaigns={campaignsByProject}
                      query={query}
                      onOpen={(id) => navigate(id, "", "campaigns")}
                      onManage={(value) => setManaging({ kind: "project", value })}
                      onCreate={() => setCreating({ kind: "project", projectId: "" })}
                    />
                  )
                )}
              </div>
            )}
            {section === "analytics" && (
              <div className={styles.workspaceContent}>
                <AnalyticsView
                  key={projectId}
                  projectId={projectId}
                  onProject={(id) => navigate(id, "", "analytics")}
                  onCampaign={(id) => {
                    const campaign = campaigns.find((item) => item._id === id);
                    navigate(campaign?.project ?? projectId, id, "analytics");
                  }}
                />
                {!projectId && (
                  <div className={styles.audienceSection}>
                    <SocialCounts />
                  </div>
                )}
              </div>
            )}
            {section === "campaigns" && (
              <div
                id="dashboard-campaigns"
                tabIndex={-1}
                aria-busy={loading}
                className={`${styles.listWrap} ${view === "board" ? styles.board : ""}`}
              >
                {loading && !filtered.length ? (
                  <div role="status" className={styles.emptyState}>
                    Loading campaigns…
                  </div>
                ) : (
                  <>
                    {groups.map(({ id, name, items }) => (
                      <section className={styles.group} key={id} aria-label={name}>
                        <div className={styles.groupHead}>
                          <button
                            aria-expanded={!collapsed.includes(id)}
                            className={styles.groupToggle}
                            onClick={() =>
                              setCollapsed((current) =>
                                current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                              )
                            }
                          >
                            {collapsed.includes(id) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                            {grouped && <ProjectAvatar id={id} name={name} />}
                            <h2>{name}</h2>
                            <span>{items.length}</span>
                          </button>
                          <button
                            className={`${styles.iconButton} ${styles.groupAdd}`}
                            aria-label={`New campaign in ${name}`}
                            onClick={() => openNew(grouped ? id : projectId)}
                          >
                            <Plus />
                          </button>
                        </div>
                        {!collapsed.includes(id) && (
                          <div className={styles.rows}>
                            {items.map((campaign) => (
                              <button
                                className={styles.campaignRow}
                                key={campaign._id}
                                onClick={() => navigate(projectId, campaign._id)}
                              >
                                {visible.includes("ID") && (
                                  <span className={styles.campaignId} title={campaign._id}>
                                    {campaign._id.slice(-6)}
                                  </span>
                                )}
                                <span className={styles.campaignTitle}>{campaign.title}</span>
                                <span className={styles.rowMeta}>
                                  {visible.includes("Project") && (
                                    <span className={styles.projectTag} title={campaign.projectName}>
                                      {campaign.projectName}
                                    </span>
                                  )}
                                  {visible.includes("Destination") && (
                                    <span className={styles.destination} title={campaign.url}>
                                      {campaign.url.replace(/^https?:\/\//, "")}
                                    </span>
                                  )}
                                  {visible.includes("Links") && (
                                    <span
                                      className={styles.links}
                                      title={
                                        campaign.linkCount === undefined
                                          ? "Link count unavailable"
                                          : `${campaign.linkCount} tracking links`
                                      }
                                    >
                                      <Link2 />
                                      {campaign.linkCount ?? "…"}
                                    </span>
                                  )}
                                  {visible.includes("Created") && (
                                    <time className={styles.date} dateTime={campaign.createdAt}>
                                      {date(campaign.createdAt)}
                                    </time>
                                  )}
                                </span>
                              </button>
                            ))}
                            {!items.length && (
                              <p className={styles.emptyGroup}>
                                {campaignErrors[id] ? "Campaigns unavailable" : "No campaigns"}
                              </p>
                            )}
                          </div>
                        )}
                      </section>
                    ))}
                    {!filtered.length && !projectsError && !failedProjects.length && (
                      <div className={styles.emptyState}>
                        <h2>
                          {unavailableProject
                            ? "Project unavailable"
                            : !projects.length
                              ? "Create your first project"
                              : hasFilters && (query || campaigns.length)
                                ? "No campaigns match this view"
                                : "Create your first campaign"}
                        </h2>
                        <p>
                          {unavailableProject
                            ? "This project may have been deleted or is no longer available."
                            : !projects.length
                              ? "Start a project, then add a campaign to generate tracking links."
                              : query
                                ? "Try another search or choose a different project."
                                : "Add a destination URL to start tracking your campaign."}
                        </p>
                        <button
                          className={styles.textButton}
                          onClick={unavailableProject || query ? clearFilters : () => openNew()}
                        >
                          {unavailableProject || query
                            ? "Reset filters"
                            : projects.length
                              ? "New campaign"
                              : "New project"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
        <footer className={styles.mainFooter}>
          <span>
            {section === "projects"
              ? `${projects.length} projects`
              : section === "analytics"
                ? "Analytics"
                : `${filtered.length} ${filtered.length === 1 ? "campaign" : "campaigns"}`}
          </span>
          <span>
            {loading
              ? "Updating…"
              : projectsError || failedProjects.length
                ? "Some data is unavailable"
                : `${relevantProjects.length} ${relevantProjects.length === 1 ? "project" : "projects"}`}
          </span>
        </footer>
      </main>
      {creating && (
        <DashboardCreateDrawer
          key={`${creating.kind}:${creating.projectId}`}
          {...creating}
          projects={projects}
          onClose={() => {
            setCreating(null);
            if (params.has("create")) navigate(projectId);
          }}
          onProjectCreated={(project) => {
            setQuery("");
            navigate(project._id, "", "campaigns");
            setCreating({ kind: "campaign", projectId: project._id });
          }}
          onCampaignCreated={(campaign) => {
            setCreating(null);
            setQuery("");
            setCollapsed([]);
            navigate(campaign.project, campaign._id, "campaigns");
          }}
        />
      )}
      <Drawer
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) navigate(projectId);
        }}
        showSwipeHandle
      >
        <DrawerContent
          className={`t-panel-slide ${styles.theme} ${styles.dialog} ${styles.drawer} ${styles.detailDrawer}`}
          overlayClassName="t-panel-backdrop"
        >
          <div className={styles.detailHeader}>
            <div>
              <DrawerTitle className={styles.dialogTitle}>{selected?.title ?? "Campaign details"}</DrawerTitle>
              <DrawerDescription className={styles.helpText}>
                {selected?.projectName ?? "Tracking links and campaign performance"}
              </DrawerDescription>
            </div>
            <button className={styles.iconButton} aria-label="Close campaign" onClick={() => navigate(projectId)}>
              <X />
            </button>
          </div>
          <div className={styles.detailBody}>
            {selected && displayedLink ? (
              <LinkAnalytics
                key={displayedLink}
                projectId={selected.project}
                campaignId={selected._id}
                slug={displayedLink}
                onBack={() => navigate(projectId, selected._id)}
              />
            ) : selected ? (
              <CampaignOverview
                key={`${selected._id}:${selected.updatedAt}`}
                projectId={selected.project}
                campaignId={selected._id}
                initialAnalytics={section === "analytics"}
                initialAddLink={params.get("create") === "link"}
                onManage={() => setManaging({ kind: "campaign", value: selected })}
              />
            ) : (
              <div className={styles.emptyState} role="status">
                {loading ? "Loading campaign…" : "Campaign unavailable. Close this panel and refresh your campaigns."}
              </div>
            )}
          </div>
        </DrawerContent>
        {managing?.kind === "campaign" && managementDrawer}
      </Drawer>
      {managing?.kind === "project" && managementDrawer}
    </div>
  );
}
