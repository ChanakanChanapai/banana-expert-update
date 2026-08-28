import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Loader2 } from "lucide-react";

/* ---------- Types ---------- */

interface FarmInfo {
  farm_name: string | null;
  rating: number | null;
  total_reviews: number | null;
}

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  products: {
    name: string;
  } | null;
  profiles: {
    full_name: string | null;
  } | null;
}

/* ---------- Component ---------- */

const FarmReviews = () => {
  const navigate = useNavigate();
  const { farmId } = useParams();

  const [farm, setFarm] = useState<FarmInfo | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------- Load Data ---------- */

  const loadData = useCallback(async () => {
    if (!farmId) return;
    console.log("farmId from URL:", farmId);
    try {
      setLoading(true);

      /* ---------- FARM ---------- */

      const { data: farmData, error: farmError } = await supabase
        .from("farm_profiles")
        .select("farm_name, rating, total_reviews")
        .eq("id", farmId)
        .maybeSingle();
      
      if (farmError) {
        console.error("Farm load error:", farmError);
        return;
      }

      if (!farmData) {
        navigate("/not-found");
        return;
      }

      setFarm(farmData);
    
      /* ---------- REVIEWS ---------- */

      const { data: reviewData, error: reviewError } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          comment,
          created_at,
          products ( name ),
          profiles ( full_name )
        `)
        .eq("farm_id", farmId)
        .order("created_at", { ascending: false });

      if (reviewError) {
        console.error("Review load error:", reviewError);
        return;
      }

      setReviews(reviewData ?? []);

      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }

    }, [farmId, navigate]);
          
    
  /* ---------- Auth + Init ---------- */

  useEffect(() => {
  if (farmId) {
    loadData();
  }
}, [farmId, loadData]);

  /* ---------- Helpers ---------- */

  const formatDate = (date?: string | null) =>
    date ? new Date(date).toLocaleDateString("th-TH") : "-";

  const renderStars = (rating: number) => {
  const safeRating = Math.max(0, Math.min(5, Math.floor(rating)));

  return (
    <div className="flex items-center gap-1 text-yellow-500">
      {Array.from({ length: safeRating }).map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-current" />
      ))}
    </div>
  );
};
    
  /* ---------- Loading ---------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen bg-muted/30">
      {/* NAVBAR */}
      <nav className="sticky top-0 bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </Button>

          <h1 className="text-xl font-bold">รีวิวฟาร์ม</h1>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* FARM SUMMARY */}
        <Card className="p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">
              {farm?.farm_name ?? "-"}
            </h2>

            <p className="text-sm text-muted-foreground">
              {farm?.total_reviews ?? 0} รีวิวทั้งหมด
            </p>
          </div>

          <div className="flex items-center gap-2 text-yellow-500">
            <Star className="w-6 h-6 fill-current" />
            <span className="text-xl font-bold">
              {typeof farm?.rating === "number"
                ? farm.rating.toFixed(1)
                : "0.0"}
            </span>
          </div>
        </Card>

        {/* REVIEWS */}
        {reviews.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            ยังไม่มีรีวิว
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <Card key={r.id} className="p-6 space-y-3">
                {/* Product */}
                <p className="font-semibold text-lg">
                  {r.products?.name ?? "สินค้า"}
                </p>

                {/* Stars */}
                {renderStars(r.rating)}

                {/* Comment */}
                {r.comment && (
                  <p className="text-muted-foreground">{r.comment}</p>
                )}

                {/* Footer */}
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>
                    {r.profiles?.full_name ?? "ผู้ใช้งานทั่วไป"}
                  </span>

                  <span>{formatDate(r.created_at)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmReviews;
