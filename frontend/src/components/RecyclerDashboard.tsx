import {
  useEffect,
  useState,
} from "react";

import {
  useTranslation,
} from "react-i18next";

import { API_BASE } from "../lib/api";

interface RecyclerDashboardProps {
  recyclerId: string;
}

interface Match {
  lotId: string;
  materialCode: string;
  materialName: string;
  category: string;
  weightKg: number;
  estimatedValueINR: number | null;
  distanceKm: number;
  withinServiceArea: boolean;
  status: string;
}

interface DashboardResponse {
  recycler: {
    id: string;
    name: string;
    authorizationNumber: string;
  };

  matches: Match[];
}

export default function RecyclerDashboard({
  recyclerId,
}: RecyclerDashboardProps) {
  const { t } =
    useTranslation();

  const [
    dashboard,
    setDashboard,
  ] =
    useState<DashboardResponse | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `${API_BASE}/api/recyclers/dashboard/${encodeURIComponent(
            recyclerId
          )}`
        );

      if (!response.ok) {
        throw new Error(
          "Unable to load dashboard"
        );
      }

      const data =
        (await response.json()) as DashboardResponse;

      setDashboard(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();

    const interval =
      window.setInterval(
        () => {
          void loadDashboard();
        },
        30000
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, [recyclerId]);

  if (loading) {
    return (
      <div className="card">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card"
        role="alert"
      >
        <p>{error}</p>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            void loadDashboard()
          }
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="stack">
      <div>
        <div className="h1">
          {t("dashboard")}
        </div>

        <p className="muted">
          {dashboard.recycler.name}
        </p>

        <span className="pill pill-teal">
          {t("authorized")}
        </span>
      </div>

      {dashboard.matches.length ===
      0 ? (
        <div className="card">
          <p className="muted">
            No matching lots right
            now.
          </p>
        </div>
      ) : (
        dashboard.matches.map(
          (lot) => (
            <article
              className="card stack"
              key={lot.lotId}
            >
              <div className="row between">
                <strong>
                  {lot.materialName ||
                    lot.materialCode}
                </strong>

                <span className="pill pill-amber">
                  {lot.weightKg} kg
                </span>
              </div>

              <div className="muted">
                {lot.category}
              </div>

              <div className="row between">
                <span>
                  {t(
                    "distance"
                  )}
                </span>

                <strong>
                  {lot.distanceKm} km
                </strong>
              </div>

              <div className="row between">
                <span>
                  {t(
                    "estimatedValue"
                  )}
                </span>

                <strong>
                  {lot.estimatedValueINR !==
                  null
                    ? `₹${lot.estimatedValueINR.toLocaleString(
                        "en-IN"
                      )}`
                    : "—"}
                </strong>
              </div>

              <div className="row between">
                <span>
                  Status
                </span>

                <span className="pill pill-teal">
                  {lot.status}
                </span>
              </div>

              {!lot.withinServiceArea && (
                <div
                  className="card"
                  role="note"
                >
                  This lot is outside
                  the normal service
                  radius.
                </div>
              )}
            </article>
          )
        )
      )}
    </div>
  );
}