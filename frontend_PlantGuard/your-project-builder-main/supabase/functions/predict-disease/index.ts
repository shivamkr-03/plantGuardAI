import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    // Get the ML API URL from secrets
    const ML_API_URL = Deno.env.get("ML_API_URL");
    if (!ML_API_URL) {
      throw new Error(
        "ML_API_URL not configured. Please set your ML model API endpoint."
      );
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      throw new Error("No image file provided");
    }

    // Forward the request to the external ML API
    const mlFormData = new FormData();
    mlFormData.append("image", imageFile);

    const mlResponse = await fetch(ML_API_URL, {
      method: "POST",
      body: mlFormData,
    });

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      console.error("ML API error:", errorText);
      throw new Error(`ML API returned ${mlResponse.status}: ${errorText}`);
    }

    const mlResult = await mlResponse.json();

    // Save prediction to database
    const predictionData = {
      user_id: userId,
      disease_label: mlResult.disease_label || mlResult.label,
      confidence: mlResult.confidence || 0,
      treatment_ids: mlResult.treatments
        ? mlResult.treatments.map((t: any) => t.id)
        : null,
      metadata: mlResult,
      image_path: null, // Could be updated if you want to store the image
    };

    const { data: prediction, error: dbError } = await supabase
      .from("predictions")
      .insert(predictionData)
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Don't fail the request if DB insert fails, just log it
    }

    // Return the prediction result
    return new Response(
      JSON.stringify({
        prediction_id: prediction?.uuid || mlResult.prediction_id,
        disease_label: mlResult.disease_label || mlResult.label,
        confidence: mlResult.confidence || 0,
        treatments: mlResult.treatments || [],
        inference_time_ms: mlResult.inference_time_ms,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in predict-disease function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to process prediction",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});