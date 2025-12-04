// src/pages/History.tsx
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type HistoryEntryRaw = Record<string, any>;

type HistoryEntry = {
  id?: number | string;
  user_id?: number | string;
  created_at?: string | null;
  label?: string | null;
  disease_label?: string | null;
  confidence?: number | null;
  treatment?: any;
  metadata?: any;
};

const API = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000";

const History = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      toast.error("Please log in to view your history");
      navigate("/auth");
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/history`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const text = await res.text().catch(() => "");
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseErr) {
          console.warn("Could not parse history JSON:", parseErr, "raw:", text);
        }

        console.log("GET /history response:", res.status, data ?? text);

        if (!res.ok) {
          const errMsg =
            (data && (data.error || data.message)) ||
            `Failed to fetch history (status ${res.status})`;
          throw new Error(errMsg);
        }

        // tolerant extraction of entries
        let entries: HistoryEntryRaw[] = [];
        if (Array.isArray(data)) {
          entries = data;
        } else if (data?.history && Array.isArray(data.history)) {
          entries = data.history;
        } else if (data?.entries && Array.isArray(data.entries)) {
          entries = data.entries;
        } else if (data) {
          // try to find first array in object
          const arr = Object.values(data).find((v) => Array.isArray(v));
          if (Array.isArray(arr)) entries = arr as HistoryEntryRaw[];
        }

        // normalize/map fields to expected shape
        const normalized: HistoryEntry[] = (entries || []).map((e: HistoryEntryRaw) => ({
          id: e.id ?? e._id ?? undefined,
          user_id: e.user_id ?? e.userId ?? undefined,
          // prefer snake_case created_at, fallback to timestamp or createdAt
          created_at: e.created_at ?? e.timestamp ?? e.createdAt ?? null,
          // name/label normalization
          label: e.label ?? e.disease_label ?? e.name ?? null,
          disease_label: e.disease_label ?? e.label ?? e.name ?? null,
          // confidence can be provided as confidence or conf
          confidence:
            typeof e.confidence === "number"
              ? e.confidence
              : typeof e.conf === "number"
              ? e.conf
              : null,
          treatment: e.treatment ?? e.treatments ?? null,
          metadata: e.metadata ?? null,
        }));

        setHistory(normalized);
      } catch (err: any) {
        console.error("History fetch error:", err);
        toast.error(err.message || "Unable to load history");
        if (err.message && err.message.toLowerCase().includes("invalid")) {
          localStorage.removeItem("access_token");
          navigate("/auth");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  function fmtDate(iso: string | null | undefined) {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return String(iso);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Prediction History</h1>
            <p className="text-muted-foreground mt-1">All your saved detections in one place.</p>
          </div>
          <div>
            <Button variant="outline" onClick={() => navigate("/predict")}>
              New Prediction
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading && (
            <Card>
              <CardContent>
                <p className="text-muted-foreground">Loading your history...</p>
              </CardContent>
            </Card>
          )}

          {!loading && history.length === 0 && (
            <Card>
              <CardContent>
                <p className="text-muted-foreground">No history yet — try analyzing a plant!</p>
              </CardContent>
            </Card>
          )}

          {!loading &&
            history.map((h, idx) => (
              <Card key={h.id ?? idx}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-base">
                      {h.label
                        ? String(h.label).replace(/___/g, " - ").replace(/_/g, " ")
                        : `Entry #${h.id ?? idx}`}
                    </span>
                    <span className="text-sm text-muted-foreground">{fmtDate(h.created_at)}</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Confidence:{" "}
                    <strong>
                      {h.confidence != null ? (h.confidence * 100).toFixed(1) + "%" : "N/A"}
                    </strong>
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {h.treatment ? (
                    <div className="mb-3">
                      <h4 className="font-semibold mb-1">Treatment</h4>
                      <div className="text-sm text-muted-foreground whitespace-pre-line">
                        {typeof h.treatment === "string"
                          ? h.treatment
                          : JSON.stringify(h.treatment, null, 2)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground mb-3">No treatment info stored.</div>
                  )}

                  {h.metadata && (
                    <div className="mb-3">
                      <h4 className="font-semibold mb-1">Extra Info</h4>
                      <pre className="text-xs text-muted-foreground bg-muted/10 p-2 rounded">
                        {typeof h.metadata === "string" ? h.metadata : JSON.stringify(h.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => navigate("/predict")}>
                      Re-run
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
};

export default History;
