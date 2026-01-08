import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import StarRating from "./StarRating";

interface ReviewFormProps {
  reservationId: string;
  vehicleId: string;
  reviewedUserId: string;
  reviewType: "owner_to_renter" | "renter_to_owner";
  onSuccess?: () => void;
}

const ReviewForm = ({ 
  reservationId, 
  vehicleId, 
  reviewedUserId, 
  reviewType,
  onSuccess 
}: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error("Veuillez donner une note");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("reviews").insert({
        reservation_id: reservationId,
        vehicle_id: vehicleId,
        reviewer_id: user.id,
        reviewed_user_id: reviewedUserId,
        rating,
        comment: comment.trim() || null,
        review_type: reviewType,
      });

      if (error) throw error;

      toast.success("Avis soumis avec succès !");
      setRating(0);
      setComment("");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la soumission");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Votre note</label>
        <StarRating 
          rating={rating} 
          interactive 
          size="lg"
          onRatingChange={setRating} 
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          Commentaire (optionnel)
        </label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Partagez votre expérience..."
          rows={3}
          className="bg-background/50"
        />
      </div>

      <Button 
        type="submit" 
        disabled={rating === 0 || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Envoi..." : "Soumettre l'avis"}
      </Button>
    </form>
  );
};

export default ReviewForm;
