import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Leaf,
  Camera,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const API = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000";

const Predict: React.FC = () => {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<any>(null);

  // helper to attempt to save to history. returns saved entry or null
  const saveHistory = async (payload: any) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.log("No token present; skipping history save");
      return null;
    }

    try {
      console.log("Saving history ->", payload);
      const res = await fetch(`${API}/history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => "");
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      console.log("History save response:", res.status, data ?? text);

      if (!res.ok) {
        const err = (data && (data.error || data.message)) || `History save failed (${res.status})`;
        toast.error(String(err));
        return null;
      }

      toast.success("Saved to history");
      // backend might return saved object or not; try to return useful object
      return data && typeof data === "object" ? data : null;
    } catch (err: any) {
      console.error("History save exception:", err);
      return null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setPrediction(null);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPrediction(null);
  };

  const handlePredict = async () => {
    if (!selectedFile) {
      toast.error("Please select an image first");
      return;
    }

    setIsLoading(true);
    setPrediction(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const token = localStorage.getItem("access_token") || "";

      const res = await fetch(`${API}/predict`, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const data = await res.json().catch(() => {
        throw new Error("Invalid JSON response from server");
      });

      if (!res.ok) {
        throw new Error(data.error || "Prediction failed");
      }

      // adapt to backend response shape: accept label or disease_label
      const mappedPrediction = {
        disease_label: data.label ?? data.disease_label ?? data.name ?? "Unknown",
        confidence: typeof data.confidence === "number" ? data.confidence : (data.confidence ?? 0),
        treatments: data.treatment ? [{ title: "Recommended treatment", steps: data.treatment }] : (data.treatments ?? []),
        raw: data,
      };

      setPrediction(mappedPrediction);
      toast.success("Disease predicted successfully!");

      // Prepare payload for history save — include both label and disease_label to be safe
      const historyPayload = {
        label: data.label ?? data.disease_label ?? mappedPrediction.disease_label,
        disease_label: data.disease_label ?? data.label ?? mappedPrediction.disease_label,
        confidence: mappedPrediction.confidence,
        treatment: data.treatment ?? data.treatments ?? null,
        metadata: { filename: selectedFile.name },
      };

      // Try to save history; attempt optimistic UI by navigating to History or notify user
      const saved = await saveHistory(historyPayload);

      // If backend returns the saved entry with an id, we can navigate to history (or refresh)
      if (saved) {
        // optional: navigate to history to see saved entry immediately
        // navigate("/history");
        // or do nothing — History page will fetch latest when visited
        console.log("History saved object:", saved);
      }
    } catch (error: any) {
      console.error("Prediction error:", error);
      toast.error(error.message || "Failed to predict disease. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <Leaf className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PlantCare AI
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/history")}>
              History
            </Button>
            <Button variant="outline" onClick={() => navigate("/profile")}>
              Profile
            </Button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Disease Detection</h1>
            <p className="text-muted-foreground">
              Upload a clear photo of your plant's leaf for instant disease detection
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Image</CardTitle>
                <CardDescription>Select a clear image of the affected leaf</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!previewUrl ? (
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
                    </div>
                    <Input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={handleClearImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <Button
                  onClick={handlePredict}
                  disabled={!selectedFile || isLoading}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Analyze Plant
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Section */}
            <Card>
              <CardHeader>
                <CardTitle>Prediction Results</CardTitle>
                <CardDescription>AI-powered disease detection results</CardDescription>
              </CardHeader>
              <CardContent>
                {!prediction && !isLoading && (
                  <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                    <Leaf className="w-16 h-16 mb-4 opacity-50" />
                    <p>Upload and analyze an image to see results</p>
                  </div>
                )}

                {isLoading && (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground">Analyzing your plant...</p>
                  </div>
                )}

                {prediction && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {prediction.disease_label?.toLowerCase().includes("healthy") ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-orange-500" />
                        )}
                        <h3 className="font-semibold text-lg">
                          {prediction.disease_label
                            ?.replace(/___/g, " - ")
                            .replace(/_/g, " ")}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Confidence</span>
                          <span className="font-medium">
                            {(prediction.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={prediction.confidence * 100} className="h-2" />
                      </div>
                    </div>

                    {prediction.treatments && prediction.treatments.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Treatment Recommendations</h4>
                        <div className="space-y-3">
                          {prediction.treatments.map((treatment: any, idx: number) => (
                            <Card key={idx} className="p-4 bg-muted/30">
                              <h5 className="font-medium mb-2">{treatment.title}</h5>
                              <p className="text-sm text-muted-foreground whitespace-pre-line">
                                {treatment.steps}
                              </p>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* optional raw debug */}
                    {prediction.raw && (
                      <pre className="mt-2 text-xs bg-slate-50 p-3 rounded-md overflow-auto text-muted-foreground">
                        {JSON.stringify(prediction.raw, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Predict;
