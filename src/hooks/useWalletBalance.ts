import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';

interface WalletState {
  balance: number;
  loading: boolean;
  canPublish: boolean;
  isReadOnly: boolean;
}

export const useWalletBalance = (userId: string | undefined): WalletState => {
  const [state, setState] = useState<WalletState>({
    balance: 0,
    loading: true,
    canPublish: false,
    isReadOnly: false,
  });

  useEffect(() => {
    if (!userId) return;

    const fetchBalance = async () => {
      const { data: wallet } = await supabase
        .from("owner_wallets")
        .select("balance")
        .eq("user_id", userId)
        .single();

      const balance = wallet?.balance ?? 0;
      const isReadOnly = balance <= 0;
      const canPublish = balance >= 5; // Minimum credits to publish

      setState({
        balance,
        loading: false,
        canPublish,
        isReadOnly,
      });
    };

    fetchBalance();

    // Subscribe to wallet changes
    const channel = supabase
      .channel(`wallet-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "owner_wallets",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            const newBalance = (payload.new as any).balance ?? 0;
            setState((prev) => ({
              ...prev,
              balance: newBalance,
              canPublish: newBalance >= 5,
              isReadOnly: newBalance <= 0,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return state;
};

export default useWalletBalance;
