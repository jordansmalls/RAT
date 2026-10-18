"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ExternalLink } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import dashboard from "@/features/dashboard/components/dashboard.module.css";
import { errorMessage } from "@/lib/api";
import type { SponsorReport } from "../api";
import { formatDate, formatNumber } from "../format";
import {
  useCreateSponsorReport,
  useDeleteSponsorReport,
  useSponsorReportPreview,
  useSponsorReports,
  useUpdateSponsorReport,
} from "../queries";
import {
  defaultReportSections,
  reportSectionKeys,
  reportSectionLabels,
  type ReportSectionKey,
  type ReportSections,
} from "../schemas";
import { PublicReportView } from "./public-report-view";
import styles from "./sponsor.module.css";

function SectionToggles({
  value,
  onChange,
  hasDeal,
  disabled,
}: {
  value: ReportSections;
  onChange: (key: ReportSectionKey, checked: boolean) => void;
  hasDeal: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={styles.toggles} role="group" aria-label="Report sections">
      {reportSectionKeys.map((key) => (
        <label key={key} title={key === "dealValue" && !hasDeal ? "Add a deal to this campaign first" : undefined}>
          <Checkbox
            checked={value[key]}
            disabled={disabled}
            onCheckedChange={(checked) => onChange(key, checked === true)}
          />
          {reportSectionLabels[key]}
          {key === "dealValue" && !hasDeal && <span className={styles.pill}>No deal yet</span>}
        </label>
      ))}
    </div>
  );
}

function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link. Select it and copy it manually.");
    }
  };
  return (
    <div className={styles.shareBox}>
      <code title={url}>{url}</code>
      <button className={dashboard.textButton} onClick={() => void copy()}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <a className={dashboard.textButton} href={url} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="size-3.5" /> Open
      </a>
    </div>
  );
}

function CreateReport({
  campaignId,
  campaignTitle,
  hasDeal,
  onCreated,
}: {
  campaignId: string;
  campaignTitle: string;
  hasDeal: boolean;
  onCreated: (report: SponsorReport) => void;
}) {
  const create = useCreateSponsorReport(campaignId);
  const [title, setTitle] = useState("");
  const [expires, setExpires] = useState("");
  const [sections, setSections] = useState<ReportSections>(defaultReportSections);
  const [error, setError] = useState("");

  const submit = () => {
    setError("");
    create.mutate(
      {
        title: title.trim() || undefined,
        sections,
        expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
      },
      {
        onSuccess: (report) => {
          setTitle("");
          setExpires("");
          onCreated(report);
        },
        onError: (err) => setError(errorMessage(err, "Could not create the report.")),
      },
    );
  };

  return (
    <div className={styles.reportItem}>
      <div className={styles.form} style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        <label>
          Report title
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={campaignTitle}
            maxLength={120}
          />
        </label>
        <label>
          Expires (optional)
          <Input type="date" value={expires} onChange={(event) => setExpires(event.target.value)} />
        </label>
      </div>
      <SectionToggles
        value={sections}
        hasDeal={hasDeal}
        onChange={(key, checked) => setSections({ ...sections, [key]: checked })}
      />
      {error && (
        <p role="alert" className={`${dashboard.errorText} mt-3`}>
          {error}
        </p>
      )}
      <div className={styles.formActions}>
        <Button onClick={submit} disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create share link"}
        </Button>
      </div>
    </div>
  );
}

const statusTone = { active: "good", revoked: "bad", expired: "warn" } as const;

function ReportItem({
  report,
  campaignId,
  hasDeal,
  shareUrl,
  onShareUrl,
  previewing,
  onPreview,
}: {
  report: SponsorReport;
  campaignId: string;
  hasDeal: boolean;
  shareUrl?: string;
  onShareUrl: (url: string) => void;
  previewing: boolean;
  onPreview: () => void;
}) {
  const update = useUpdateSponsorReport(campaignId);
  const remove = useDeleteSponsorReport(campaignId);
  const busy = update.isPending || remove.isPending;
  const patch = (body: Parameters<typeof update.mutate>[0]["body"], success?: string) =>
    update.mutate(
      { id: report._id, body },
      {
        onSuccess: (updated) => {
          if (updated.shareUrl) onShareUrl(updated.shareUrl);
          if (success) toast.success(success);
        },
        onError: (error) => toast.error(errorMessage(error, "Could not update the report.")),
      },
    );

  return (
    <div className={styles.reportItem}>
      <div className={styles.reportItemHead}>
        <div>
          <h3>
            {report.title}{" "}
            <span className={styles.pill} data-tone={statusTone[report.status]}>
              {report.status}
            </span>
          </h3>
          <p className={styles.reportMeta}>
            {formatNumber(report.viewCount)} {report.viewCount === 1 ? "view" : "views"}
            {report.lastViewedAt && ` · last viewed ${formatDate(report.lastViewedAt)}`} · created{" "}
            {formatDate(report.createdAt)}
            {report.expiresAt && ` · expires ${formatDate(report.expiresAt)}`}
          </p>
        </div>
        <div className={dashboard.inlineActions}>
          <button className={dashboard.textButton} onClick={onPreview}>
            {previewing ? "Hide preview" : "Preview"}
          </button>
          <button
            className={dashboard.textButton}
            disabled={busy}
            onClick={() => patch({ regenerate_token: true }, "New link created. The old link no longer works.")}
          >
            {shareUrl ? "Regenerate link" : "Get link"}
          </button>
          <button
            className={dashboard.textButton}
            disabled={busy || report.status === "expired"}
            onClick={() =>
              patch(
                { revoked: report.status !== "revoked" },
                report.status === "revoked" ? "Report turned back on." : "Report turned off.",
              )
            }
          >
            {report.status === "revoked" ? "Turn on" : "Turn off"}
          </button>
          <button
            className={dashboard.textButton}
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`Delete "${report.title}"? Its link stops working immediately.`)) return;
              remove.mutate(report._id, {
                onSuccess: () => toast.success("Report deleted."),
                onError: (error) => toast.error(errorMessage(error, "Could not delete the report.")),
              });
            }}
          >
            Delete
          </button>
        </div>
      </div>
      {shareUrl && <ShareLink url={shareUrl} />}
      {!shareUrl && report.status === "active" && (
        <p className={`${styles.reportMeta} mt-2`}>
          For security, links are only shown once. Use “Get link” to create a fresh one (the old link stops working).
        </p>
      )}
      <SectionToggles
        value={report.sections}
        hasDeal={hasDeal}
        disabled={busy}
        onChange={(key, checked) => patch({ sections: { [key]: checked } })}
      />
      {previewing && <ReportPreview reportId={report._id} />}
    </div>
  );
}

function ReportPreview({ reportId }: { reportId: string }) {
  const preview = useSponsorReportPreview(reportId);
  return (
    <div className="mt-4 rounded-lg border p-3 sm:p-4" style={{ background: "var(--bg)" }}>
      <p className={`${dashboard.metadata} mb-3`}>
        Preview · this is what sponsors see. Previews don&apos;t count as views.
      </p>
      {preview.data ? (
        <PublicReportView data={preview.data} />
      ) : preview.isError ? (
        <div role="alert" className={dashboard.errorBanner}>
          Could not load the preview.
          <button onClick={() => void preview.refetch()}>Retry</button>
        </div>
      ) : (
        <p role="status" className={dashboard.helpText}>
          Building preview…
        </p>
      )}
    </div>
  );
}

/** Create and manage public sponsor report links for one campaign. */
export function SponsorReports({
  campaignId,
  campaignTitle,
  hasDeal,
}: {
  campaignId: string;
  campaignTitle: string;
  hasDeal: boolean;
}) {
  const reports = useSponsorReports(campaignId);
  // Plaintext links are only returned on create/regenerate, so keep them for this session.
  const [shareUrls, setShareUrls] = useState<Record<string, string>>({});
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const list = reports.data ?? [];

  return (
    <section className={dashboard.analyticsCard} aria-labelledby="sponsor-reports-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="sponsor-reports-heading">Sponsor reports</h2>
          <p>Share a live, read-only report with a sponsor. Choose what they see and turn links off at any time.</p>
        </div>
        <Button variant={creating ? "ghost" : "default"} onClick={() => setCreating(!creating)}>
          {creating ? "Cancel" : "New report"}
        </Button>
      </div>
      <div className={styles.reportList}>
        {(creating || (reports.isSuccess && !list.length)) && (
          <CreateReport
            campaignId={campaignId}
            campaignTitle={campaignTitle}
            hasDeal={hasDeal}
            onCreated={(report) => {
              setCreating(false);
              if (report.shareUrl) setShareUrls((urls) => ({ ...urls, [report._id]: report.shareUrl! }));
              toast.success("Share link created. Copy it now. It is only shown once.");
            }}
          />
        )}
        {reports.isPending ? (
          <p role="status" className={dashboard.helpText}>
            Loading reports…
          </p>
        ) : reports.isError ? (
          <div role="alert" className={dashboard.errorBanner}>
            Could not load reports.
            <button onClick={() => void reports.refetch()}>Retry</button>
          </div>
        ) : (
          list.map((report) => (
            <ReportItem
              key={report._id}
              report={report}
              campaignId={campaignId}
              hasDeal={hasDeal}
              shareUrl={shareUrls[report._id]}
              onShareUrl={(url) => setShareUrls((urls) => ({ ...urls, [report._id]: url }))}
              previewing={previewId === report._id}
              onPreview={() => setPreviewId(previewId === report._id ? null : report._id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
