"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth, getUserDisplayName } from "@/contexts/AuthContext";
import { useToast } from "@/components/ToastProvider";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { type Translate } from "@/lib/i18n";
import {
  type Company,
  type Appointment,
  formatDuration,
  isAppointmentAbsent,
  isAppointmentDone,
  matchesConsultantCompany,
} from "@/lib/schedule";

type Consultant = {
  id: string;
  name: string;
};

type CreateAppointmentModalProps = {
  open: boolean;
  companies: Company[];
  appointments: Appointment[];
  consultants: Consultant[];
  defaultConsultantId: string | null;
  defaultCompanyId?: string | null;
  defaultDate: Date;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
  t: Translate;
};

const padTime = (value: number) => String(value).padStart(2, "0");

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (date: Date) =>
  `${padTime(date.getHours())}:${padTime(date.getMinutes())}`;

const addMinutes = (date: Date, minutes: number) => {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
};

const PAST_TOLERANCE_MINUTES = 10;
const CSA_CACHE_PREFIX = "lead-middleware:csa:";

const getCsaCacheKey = (
  consultantId: string,
  consultantName: string | null,
) => {
  const base = consultantId.trim();
  if (base) return `${CSA_CACHE_PREFIX}${base}`;
  if (consultantName?.trim()) {
    return `${CSA_CACHE_PREFIX}${consultantName.trim().toLowerCase()}`;
  }
  return null;
};

const readCsaCache = (key: string | null) => {
  if (!key) return "";
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key)?.trim() ?? "";
  } catch {
    return "";
  }
};

const writeCsaCache = (key: string | null, value: string) => {
  if (!key) return;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // no-op: local storage may be unavailable
  }
};

const parseDateTime = (dateValue: string, timeValue: string) => {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const resolveAppointmentRange = (
  appointment: Appointment,
): { start: Date; end: Date } | null => {
  if (isAppointmentAbsent(appointment)) return null;
  const scheduledStart = new Date(appointment.startAt);
  const scheduledEnd = new Date(appointment.endAt);
  if (
    Number.isNaN(scheduledStart.getTime()) ||
    Number.isNaN(scheduledEnd.getTime())
  ) {
    return null;
  }

  let start = scheduledStart;
  let end = scheduledEnd;

  if (isAppointmentDone(appointment)) {
    const checkIn = appointment.checkInAt
      ? new Date(appointment.checkInAt)
      : null;
    const checkOut = appointment.checkOutAt
      ? new Date(appointment.checkOutAt)
      : null;

    if (checkIn && !Number.isNaN(checkIn.getTime())) {
      start = checkIn;
    }
    if (checkOut && !Number.isNaN(checkOut.getTime())) {
      end = checkOut;
    }
  }

  if (end.getTime() <= start.getTime()) return null;
  return { start, end };
};

const hasAppointmentCollision = (
  appointments: Appointment[],
  startDateTime: Date,
  endDateTime: Date,
) => {
  if (endDateTime.getTime() <= startDateTime.getTime()) return false;
  return appointments.some((appointment) => {
    const range = resolveAppointmentRange(appointment);
    if (!range) return false;
    return startDateTime < range.end && endDateTime > range.start;
  });
};

export function CreateAppointmentModal({
  open,
  companies,
  appointments,
  consultants,
  defaultConsultantId,
  defaultCompanyId,
  defaultDate,
  onClose,
  onCreated,
  t,
}: CreateAppointmentModalProps) {
  const { user, role } = useAuth();
  const toast = useToast();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const canCreateAppointment = role === "admin";

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isOutsidePortfolio, setIsOutsidePortfolio] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [consultantId, setConsultantId] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [creationNotes, setCreationNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setLoading(false);

    const now = new Date();
    const endCandidate = addMinutes(now, 60);
    const endValue =
      endCandidate.toDateString() === now.toDateString()
        ? toTimeInputValue(endCandidate)
        : "23:59";

    setDateValue(toDateInputValue(defaultDate));
    setStartTime(toTimeInputValue(now));
    setEndTime(endValue);

    const hasDefaultConsultant =
      defaultConsultantId &&
      consultants.some((item) => item.id === defaultConsultantId);
    const nextConsultant = hasDefaultConsultant
      ? defaultConsultantId
      : (consultants[0]?.id ?? "");
    setConsultantId(nextConsultant);
    setSelectedCompanyId(defaultCompanyId ?? "");
    setIsOutsidePortfolio(false);
    setCompanySearch("");
    setNewCompanyName("");
    setCreationNotes("");

    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [consultants, defaultCompanyId, defaultConsultantId, defaultDate, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
  );

  const selectedConsultant = useMemo(
    () => consultants.find((item) => item.id === consultantId) ?? null,
    [consultantId, consultants],
  );

  const baseAvailableCompanies = useMemo(() => {
    if (!selectedConsultant?.name) return [];
    const matched = companies.filter((company) =>
      matchesConsultantCompany(company, selectedConsultant.name),
    );
    return matched.filter((company) =>
      isOutsidePortfolio
        ? Boolean(company.foraCarteira)
        : !company.foraCarteira,
    );
  }, [companies, isOutsidePortfolio, selectedConsultant]);

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = companySearch.trim().toLowerCase();
    const matched = normalizedSearch
      ? baseAvailableCompanies.filter((company) =>
          company.name.toLowerCase().includes(normalizedSearch),
        )
      : baseAvailableCompanies;
    if (
      selectedCompany &&
      !matched.some((item) => item.id === selectedCompany.id)
    ) {
      return [selectedCompany, ...matched];
    }
    return matched;
  }, [baseAvailableCompanies, companySearch, selectedCompany]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    if (!companies.length) return;
    if (
      baseAvailableCompanies.some((company) => company.id === selectedCompanyId)
    )
      return;
    setSelectedCompanyId("");
  }, [baseAvailableCompanies, companies.length, selectedCompanyId]);

  const startDateTime = useMemo(
    () => parseDateTime(dateValue, startTime),
    [dateValue, startTime],
  );
  const endDateTime = useMemo(
    () => parseDateTime(dateValue, endTime),
    [dateValue, endTime],
  );

  const timeError = useMemo(() => {
    if (!dateValue || !startTime || !endTime) {
      return t("createAppointment.timeRequired");
    }
    if (!startDateTime || !endDateTime) {
      return t("createAppointment.timeInvalid");
    }
    if (endDateTime <= startDateTime) {
      return t("createAppointment.timeEndAfterStart");
    }
    return null;
  }, [dateValue, endDateTime, endTime, startDateTime, startTime, t]);

  const durationLabel = useMemo(() => {
    if (!startDateTime || !endDateTime) return "--";
    return formatDuration(
      startDateTime.toISOString(),
      endDateTime.toISOString(),
    );
  }, [endDateTime, startDateTime]);

  const normalizedNewCompanyName = newCompanyName.trim();
  const normalizedCreationNotes = creationNotes.trim();
  const hasCompanySelection = isOutsidePortfolio
    ? Boolean(selectedCompanyId || normalizedNewCompanyName)
    : Boolean(selectedCompanyId);
  const canCreate =
    hasCompanySelection && Boolean(consultantId) && !timeError && !loading;

  const handleCreate = async () => {
    if (!canCreateAppointment) {
      const message = t("createAppointment.permissionDenied");
      setError(message);
      toast.push({
        variant: "error",
        message,
      });
      return;
    }
    if (!canCreate) return;
    if (!startDateTime || !endDateTime) return;

    setError(null);
    setLoading(true);
    try {
      const normalizedConsultantId = consultantId.trim();
      const consultantName = normalizedConsultantId.includes("@")
        ? normalizedConsultantId
        : (selectedConsultant?.name ?? getUserDisplayName(user) ?? null);
      const consultantEmail = normalizedConsultantId.includes("@")
        ? normalizedConsultantId
        : null;
      const createdBy = user?.email?.trim() || null;

      const pastToleranceMs = PAST_TOLERANCE_MINUTES * 60 * 1000;
      const pastLimit = new Date(Date.now() - pastToleranceMs);
      if (startDateTime < pastLimit) {
        setError(t("createAppointment.pastNotAllowed"));
        toast.push({
          variant: "error",
          message: t("createAppointment.pastNotAllowed"),
        });
        setLoading(false);
        return;
      }

      if (hasAppointmentCollision(appointments, startDateTime, endDateTime)) {
        setError(t("createAppointment.collisionError"));
        toast.push({
          variant: "error",
          message: t("createAppointment.collisionError"),
        });
        setLoading(false);
        return;
      }

      let companyId = selectedCompanyId;

      if (isOutsidePortfolio && !companyId) {
        if (!normalizedNewCompanyName) {
          setError(t("createAppointment.companyNameRequired"));
          toast.push({
            variant: "error",
            message: t("createAppointment.companyNameRequired"),
          });
          setLoading(false);
          return;
        }

        const csaCacheKey = getCsaCacheKey(
          normalizedConsultantId,
          selectedConsultant?.name ?? null,
        );
        let cachedCsa = readCsaCache(csaCacheKey);
        if (!cachedCsa && selectedConsultant?.name) {
          const candidate = companies.find(
            (company) =>
              !company.foraCarteira &&
              Boolean(company.csa?.trim()) &&
              matchesConsultantCompany(company, selectedConsultant.name),
          );
          if (candidate?.csa?.trim()) {
            cachedCsa = candidate.csa.trim();
            writeCsaCache(csaCacheKey, cachedCsa);
          }
        }

        const { data: newCompany, error: companyError } = await supabase
          .from("companies")
          .insert({
            name: normalizedNewCompanyName,
            fora_carteira: true,
            csa: cachedCsa || null,
            email_csa: consultantEmail,
          })
          .select("id")
          .single();

        if (companyError || !newCompany?.id) {
          console.error(companyError);
          setError(t("createAppointment.createCompanyError"));
          toast.push({
            variant: "error",
            message: t("createAppointment.createCompanyError"),
          });
          setLoading(false);
          return;
        }

        companyId = newCompany.id;
      }

      const payload = {
        company_id: companyId,
        starts_at: startDateTime.toISOString(),
        ends_at: endDateTime.toISOString(),
        consultant_id: user?.id ?? null,
        consultant_name: consultantName,
        status: "scheduled",
        // address_snapshot: selectedCompany?.state ?? null,
        created_by: createdBy,
        creation_notes: normalizedCreationNotes || null,
      };

      const { error: insertError } = await supabase
        .from("apontamentos")
        .insert(payload);

      if (insertError) {
        console.error(insertError);
        setError(t("createAppointment.createError"));
        toast.push({
          variant: "error",
          message: t("createAppointment.createError"),
        });
        setLoading(false);
        return;
      }

      toast.push({
        variant: "success",
        message: t("createAppointment.createSuccess"),
      });
      await onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError(t("createAppointment.createError"));
      toast.push({
        variant: "error",
        message: t("createAppointment.createError"),
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label={t("createAppointment.dialogLabel")}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              {t("createAppointment.title")}
            </h2>
            <p className="text-xs text-slate-500">
              {t("createAppointment.subtitle")}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            {t("createAppointment.close")}
          </button>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t("createAppointment.companySection")}
            </div>

            {!selectedConsultant ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {t("createAppointment.selectConsultantToListCompanies")}
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={isOutsidePortfolio}
                onChange={(event) => {
                  const nextValue = event.target.checked;
                  setIsOutsidePortfolio(nextValue);
                  setCompanySearch("");
                  setNewCompanyName("");
                  if (!nextValue) setSelectedCompanyId("");
                }}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-sky-200"
              />
              <span>{t("createAppointment.outsidePortfolio")}</span>
            </label>

            {/* {isOutsidePortfolio ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {t("createAppointment.pickOrCreateCompany")}
              </div>
            ) : null} */}

            <label className="space-y-1 text-xs font-semibold text-slate-600">
              <span>{t("createAppointment.companySearchLabel")}</span>
              <input
                type="text"
                value={companySearch}
                onChange={(event) => setCompanySearch(event.target.value)}
                placeholder={t("createAppointment.companySearchPlaceholder")}
                disabled={!selectedConsultant}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="space-y-1 text-xs font-semibold text-slate-600">
              <span>{t("createAppointment.selectedCompany")}</span>
              <select
                value={selectedCompanyId}
                onChange={(event) => {
                  setSelectedCompanyId(event.target.value);
                  if (event.target.value) setNewCompanyName("");
                }}
                disabled={!selectedConsultant}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {selectedConsultant
                    ? t("createAppointment.selectCompany")
                    : t("createAppointment.selectConsultantFirst")}
                </option>
                {filteredCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            {isOutsidePortfolio ? (
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                <span>{t("createAppointment.newCompanyLabel")}</span>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setNewCompanyName(nextValue);
                    if (nextValue.trim()) setSelectedCompanyId("");
                  }}
                  placeholder={t("createAppointment.newCompanyPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </label>
            ) : null}

            {selectedCompany || normalizedNewCompanyName ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 mt-4">
                <div className="font-semibold text-slate-700">
                  {selectedCompany?.name ?? normalizedNewCompanyName}
                </div>
                {selectedCompany ? (
                  <div className="mt-1 grid gap-1 sm:grid-cols-2">
                    <span>
                      {t("createAppointment.companyDocument")}:{" "}
                      {selectedCompany.document ??
                        t("createAppointment.notInformed")}
                    </span>
                    <span>
                      {t("createAppointment.companyState")}:{" "}
                      {selectedCompany.state ??
                        t("createAppointment.notInformed")}
                    </span>
                    <span>
                      {t("createAppointment.companyCsa")}:{" "}
                      {selectedCompany.csa ??
                        t("createAppointment.notInformed")}
                    </span>
                    <span>
                      {t("createAppointment.companyEmail")}:{" "}
                      {selectedCompany.emailCsa ??
                        t("createAppointment.notInformed")}
                    </span>
                    <span>
                      {t("createAppointment.companyPortfolio")}:{" "}
                      {selectedCompany.carteiraDef ??
                        t("createAppointment.notInformed")}
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-slate-500">
                    {t("createAppointment.newCompanyPreview")}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t("createAppointment.scheduleSection")}
            </div>

            <label className="space-y-1 text-xs font-semibold text-slate-600">
              <span>{t("createAppointment.consultant")}</span>
              <select
                value={consultantId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setConsultantId(nextId);
                  setSelectedCompanyId("");
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                <option value="">
                  {t("createAppointment.selectConsultant")}
                </option>
                {consultants.map((consultant) => (
                  <option key={consultant.id} value={consultant.id}>
                    {consultant.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                <span>{t("createAppointment.date")}</span>
                <input
                  type="date"
                  value={dateValue}
                  onChange={(event) => setDateValue(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                <span>{t("createAppointment.startTime")}</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                <span>{t("createAppointment.endTime")}</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </label>
            </div>

            <div className="text-xs text-slate-500 mb-1">
              {t("createAppointment.duration")}:{" "}
              <span className="font-semibold">{durationLabel}</span>
            </div>

            <label className="space-y-1 text-xs font-semibold text-slate-600">
              <span>{t("createAppointment.creationNotesLabel")}</span>
              <textarea
                value={creationNotes}
                onChange={(event) => setCreationNotes(event.target.value)}
                placeholder={t("createAppointment.creationNotesPlaceholder")}
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </label>

            {timeError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {timeError}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <div className="text-xs text-slate-500">
            {selectedConsultant
              ? t("createAppointment.availableCompanies", {
                  count: filteredCompanies.length,
                })
              : t("createAppointment.selectConsultantToList")}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
            >
              {t("createAppointment.cancel")}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? t("createAppointment.creating")
                : t("createAppointment.create")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
