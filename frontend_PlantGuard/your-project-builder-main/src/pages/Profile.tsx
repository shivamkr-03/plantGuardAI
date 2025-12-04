import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Leaf, LogOut } from "lucide-react";

type ProfileShape = {
  id?: number | string;
  email?: string;
  name?: string | null;
  location?: string | null;
  bio?: string | null;
  created_at?: string | null;
};

const API = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000";

const Profile = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileShape>({
    id: undefined,
    email: "",
    name: "",
    location: "",
    bio: "",
    created_at: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Helper to get token or redirect
  const getTokenOrRedirect = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/auth");
      return null;
    }
    return token;
  };

  useEffect(() => {
    const token = getTokenOrRedirect();
    if (!token) return;

    setLoading(true);
    fetch(`${API}/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch profile");
        setProfile({
          id: data.id,
          email: data.email,
          name: data.name ?? "",
          location: data.location ?? "",
          bio: data.bio ?? "",
          created_at: data.created_at ?? "",
        });
      })
      .catch((err) => {
        console.error("Profile load error:", err);
        toast.error(err.message || "Could not load profile");
        // If unauthorized, force login
        if (err.message && (err.message.toLowerCase().includes("token") || err.message.toLowerCase().includes("unauth"))) {
          localStorage.removeItem("access_token");
          navigate("/auth");
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (k: keyof ProfileShape, v: string) => {
    setProfile((p) => ({ ...p, [k]: v }));
  };

  const handleSave = async () => {
    const token = getTokenOrRedirect();
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(`${API}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profile.name,
          location: profile.location,
          bio: profile.bio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Profile updated");
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    toast.success("Logged out");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2" onClick={() => navigate("/")}>
            <Leaf className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PlantCare AI
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/predict")}>
              Predict
            </Button>
            <Button variant="outline" onClick={() => navigate("/history")}>
              History
            </Button>
            <Button variant="destructive" onClick={handleLogout} title="Logout">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your account information</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 text-center">Loading profile…</div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Email</label>
                    <Input value={profile.email ?? ""} disabled />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Full name</label>
                    <Input
                      value={profile.name ?? ""}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Your full name (optional)"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Location</label>
                    <Input
                      value={profile.location ?? ""}
                      onChange={(e) => handleChange("location", e.target.value)}
                      placeholder="City, State, Country (optional)"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Bio</label>
                    <Textarea
                      value={profile.bio ?? ""}
                      onChange={(e) => handleChange("bio", e.target.value)}
                      placeholder="Short bio / farming notes (optional)"
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Account created:
                      </div>
                      <div className="text-sm">
                        {profile.created_at ? new Date(profile.created_at).toLocaleString() : "—"}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => navigate("/")}>Back</Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving…" : "Save changes"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
