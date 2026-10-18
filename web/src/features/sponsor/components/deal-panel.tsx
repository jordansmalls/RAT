"use client";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import dashboard from "@/features/dashboard/components/dashboard.module.css";
import type { Campaign } from "@/features/dashboard/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { applyServerErrors } from "@/lib/forms";
import { useDealValue, useDeleteDeal, useSaveDeal } from "../queries";
import {
  categoryLabels,
  currencies,
  dealCategories,
  dealFormSchema,
  toDealInput,
  type DealFormValues,
} from "../schemas";
import { DealValueCard } from "./sponsor-cards";
import { QueryCard } from "./sponsor-insights";
import styles from "./sponsor.module.css";

function defaults(campaign: Campaign): DealFormValues {
  const deal = campaign.deal;
  const category = dealCategories.find((value) => value === deal?.category) ?? "default";
  const currency = currencies.find((value) => value === deal?.currency) ?? "USD";
  return {
    amount: deal ? String(deal.amount) : "",
    currency,
    category,
    paid_at: deal?.paidAt ? deal.paidAt.slice(0, 10) : "",
  };
}

function DealForm({ campaign, onDone }: { campaign: Campaign; onDone?: () => void }) {
  const save = useSaveDeal(campaign._id);
  const form = useForm<DealFormValues>({ resolver: zodResolver(dealFormSchema), defaultValues: defaults(campaign) });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) =>
    save
      .mutateAsync(toDealInput(values))
      .then(() => {
        toast.success("Deal saved.");
        onDone?.();
      })
      .catch((error) => applyServerErrors(form, error)),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className={styles.form}>
        <label>
          Amount paid
          <Input
            {...form.register("amount")}
            inputMode="decimal"
            placeholder="2500"
            aria-invalid={!!errors.amount}
            autoFocus={!campaign.deal}
          />
        </label>
        <label>
          Currency
          <NativeSelect {...form.register("currency")} className="w-full">
            {currencies.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {value}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label>
          Sponsor category
          <NativeSelect {...form.register("category")} className="w-full">
            {dealCategories.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {categoryLabels[value]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label>
          Paid on (optional)
          <Input type="date" {...form.register("paid_at")} />
        </label>
      </div>
      {(errors.amount?.message || errors.root?.server?.message || errors.category?.message) && (
        <p role="alert" className={`${dashboard.errorText} mt-3`}>
          {errors.amount?.message ?? errors.category?.message ?? errors.root?.server?.message}
        </p>
      )}
      <div className={styles.formActions}>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : campaign.deal ? "Update deal" : "Save deal"}
        </Button>
      </div>
    </form>
  );
}

/** Store what a sponsor paid for a campaign and compare it with paid-ad cost per click. */
export function DealPanel({ campaign }: { campaign: Campaign }) {
  const hasDeal = !!campaign.deal;
  const [editing, setEditing] = useState(false);
  const value = useDealValue(campaign._id, hasDeal);
  const remove = useDeleteDeal(campaign._id);

  if (!hasDeal || editing) {
    return (
      <section className={dashboard.analyticsCard}>
        <div className={styles.cardHeader}>
          <div>
            <h2>{hasDeal ? "Edit deal" : "Add the sponsor deal"}</h2>
            <p>
              Enter what the sponsor paid to see your effective cost per click against Meta, Google, TikTok, YouTube and
              LinkedIn ads. The amount stays private unless you turn it on in a report.
            </p>
          </div>
        </div>
        <DealForm key={campaign.updatedAt} campaign={campaign} onDone={hasDeal ? () => setEditing(false) : undefined} />
      </section>
    );
  }

  const actions = (
    <div className="flex gap-1">
      <button className={dashboard.textButton} onClick={() => setEditing(true)}>
        Edit deal
      </button>
      <button
        className={dashboard.textButton}
        disabled={remove.isPending}
        onClick={() =>
          remove.mutate(undefined, {
            onSuccess: () => toast.success("Deal removed."),
            onError: () => toast.error("Could not remove the deal."),
          })
        }
      >
        Remove
      </button>
    </div>
  );

  return (
    <QueryCard title="Deal value vs paid ads" query={value}>
      {(data) => <DealValueCard data={data} actions={actions} />}
    </QueryCard>
  );
}
