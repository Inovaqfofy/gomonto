import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { User } from "lucide-react";
import StarRating from "./StarRating";

interface ReviewsListProps {
  vehicleId?: string;
  userId?: string;
  limit?: number;
}

const ReviewsList = ({ vehicleId, userId, limit = 10 }: ReviewsListProps) => {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", vehicleId, userId],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId);
      }
      if (userId) {
        query = query.eq("reviewed_user_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const averageRating = reviews?.length 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-muted/50 rounded-xl h-24" />
        ))}
      </div>
    );
  }

  if (!reviews?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun avis pour le moment
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {averageRating && (
        <div className="flex items-center gap-4 p-4 glass-card rounded-xl">
          <div className="text-4xl font-bold gradient-text">{averageRating}</div>
          <div>
            <StarRating rating={Math.round(parseFloat(averageRating))} size="md" />
            <p className="text-sm text-muted-foreground mt-1">
              {reviews.length} avis
            </p>
          </div>
        </div>
      )}

      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="glass-card rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StarRating rating={review.rating} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(review.created_at), "dd MMM yyyy", { locale: fr })}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-foreground/80">{review.comment}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsList;
