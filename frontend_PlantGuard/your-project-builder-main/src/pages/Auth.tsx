// src/pages/Auth.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auth failed");

      // data should include access_token (backend created it)
      const token = data.access_token ?? data.accessToken ?? data.token;
      if (!token) {
        console.warn("Auth response missing token:", data);
        toast.error("Login succeeded but token missing (check backend).");
        return;
      }

      // Save token and user for later pages
      localStorage.setItem("access_token", token);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        localStorage.setItem("user", JSON.stringify({ email }));
      }

      toast.success(mode === "login" ? "Logged in" : "Signed up");
      // navigate to predict (or home)
      navigate("/predict");
    } catch (err: any) {
      console.error("Auth error:", err);
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="w-full max-w-md p-4">
        <Card>
          <CardHeader>
            <CardTitle>{mode === "login" ? "Sign in" : "Create account"}</CardTitle>
            <CardDescription>
              {mode === "login" ? "Login with your account" : "Register a new account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex gap-2">
              <Button onClick={handleAuth} disabled={loading} className="flex-1">
                {loading ? (mode === "login" ? "Signing in…" : "Creating…") : mode === "login" ? "Sign in" : "Sign up"}
              </Button>
              <Button variant="outline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
                {mode === "login" ? "Register" : "Have an account?"}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              Using local backend: <code>{API}</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
