/**
 * Payment Configuration Utilities
 * Handles sandbox/live mode switching and payment routing
 */

import { supabase } from '@/lib/supabase';

export interface PlatformPaymentConfig {
  GOMONTO_ADMIN_MERCHANT_ID: string;
  PROVIDER_API_KEY_LIVE: string;
  WEBHOOK_SECRET: string;
  PAYMENT_MODE: "sandbox" | "live";
}

export interface OwnerPaymentConfig {
  fedapay_enabled: boolean;
  fedapay_public_key: string;
  fedapay_secret_key: string;
  kkiapay_enabled: boolean;
  kkiapay_public_key: string;
  kkiapay_private_key: string;
  kkiapay_secret: string;
  preferred_gateway: string;
  wave_enabled: boolean;
  wave_merchant_id: string;
  mtn_momo_enabled: boolean;
  mtn_momo_merchant_id: string;
  orange_money_enabled: boolean;
  orange_money_merchant_id: string;
  moov_money_enabled: boolean;
  moov_money_merchant_id: string;
}

/**
 * Check if the platform is in live mode
 * Auto-switches to live when all required keys are configured
 */
export const isLiveMode = async (): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from("platform_payment_config")
      .select("config_key, config_value")
      .in("config_key", ["GOMONTO_ADMIN_MERCHANT_ID", "PROVIDER_API_KEY_LIVE", "PAYMENT_MODE"]);

    if (!data) return false;

    const config = data.reduce((acc, row) => {
      acc[row.config_key] = row.config_value;
      return acc;
    }, {} as Record<string, string>);

    // Auto-detect live mode if all keys are configured
    const hasAllKeys = 
      config.GOMONTO_ADMIN_MERCHANT_ID && 
      config.GOMONTO_ADMIN_MERCHANT_ID.length > 0 &&
      config.PROVIDER_API_KEY_LIVE && 
      config.PROVIDER_API_KEY_LIVE.length > 0;

    return hasAllKeys || config.PAYMENT_MODE === "live";
  } catch (error) {
    console.error("Error checking payment mode:", error);
    return false;
  }
};

/**
 * Get owner's payment configuration for direct routing
 */
export const getOwnerPaymentConfig = async (ownerId: string): Promise<OwnerPaymentConfig | null> => {
  try {
    const { data, error } = await supabase
      .from("owner_payment_settings")
      .select("*")
      .eq("owner_id", ownerId)
      .single();

    if (error || !data) return null;

    return {
      fedapay_enabled: data.fedapay_enabled || false,
      fedapay_public_key: (data as Record<string, unknown>).fedapay_public_key as string || "",
      fedapay_secret_key: (data as Record<string, unknown>).fedapay_secret_key as string || "",
      kkiapay_enabled: (data as Record<string, unknown>).kkiapay_enabled as boolean || false,
      kkiapay_public_key: (data as Record<string, unknown>).kkiapay_public_key as string || "",
      kkiapay_private_key: (data as Record<string, unknown>).kkiapay_private_key as string || "",
      kkiapay_secret: (data as Record<string, unknown>).kkiapay_secret as string || "",
      preferred_gateway: (data as Record<string, unknown>).preferred_gateway as string || "mobile_money",
      wave_enabled: data.wave_enabled || false,
      wave_merchant_id: data.wave_merchant_id || "",
      mtn_momo_enabled: data.mtn_momo_enabled || false,
      mtn_momo_merchant_id: data.mtn_momo_merchant_id || "",
      orange_money_enabled: data.orange_money_enabled || false,
      orange_money_merchant_id: data.orange_money_merchant_id || "",
      moov_money_enabled: data.moov_money_enabled || false,
      moov_money_merchant_id: data.moov_money_merchant_id || "",
    };
  } catch (error) {
    console.error("Error fetching owner payment config:", error);
    return null;
  }
};

/**
 * Determine which payment gateway to use for a transaction
 * Priority: Owner's configured gateway > Platform default
 */
export const getPaymentRoute = async (ownerId: string): Promise<{
  useOwnerGateway: boolean;
  gateway: "fedapay" | "kkiapay" | "mobile_money" | "platform";
  config: OwnerPaymentConfig | null;
}> => {
  const ownerConfig = await getOwnerPaymentConfig(ownerId);

  if (!ownerConfig) {
    return { useOwnerGateway: false, gateway: "platform", config: null };
  }

  // Check if owner has configured a payment gateway
  if (ownerConfig.fedapay_enabled && ownerConfig.fedapay_public_key) {
    return { useOwnerGateway: true, gateway: "fedapay", config: ownerConfig };
  }

  if (ownerConfig.kkiapay_enabled && ownerConfig.kkiapay_public_key) {
    return { useOwnerGateway: true, gateway: "kkiapay", config: ownerConfig };
  }

  // Check mobile money
  if (ownerConfig.wave_enabled || ownerConfig.mtn_momo_enabled || 
      ownerConfig.orange_money_enabled || ownerConfig.moov_money_enabled) {
    return { useOwnerGateway: true, gateway: "mobile_money", config: ownerConfig };
  }

  return { useOwnerGateway: false, gateway: "platform", config: null };
};

/**
 * Payment status indicator for UI
 */
export const getPaymentStatusBadge = (config: OwnerPaymentConfig | null): {
  status: "configured" | "partial" | "not_configured";
  label: string;
  color: string;
} => {
  if (!config) {
    return { status: "not_configured", label: "Non configuré", color: "text-destructive" };
  }

  const hasGateway = config.fedapay_enabled || config.kkiapay_enabled;
  const hasMobileMoney = config.wave_enabled || config.mtn_momo_enabled || 
                         config.orange_money_enabled || config.moov_money_enabled;

  if (hasGateway && hasMobileMoney) {
    return { status: "configured", label: "Entièrement configuré", color: "text-green-500" };
  }

  if (hasGateway || hasMobileMoney) {
    return { status: "partial", label: "Partiellement configuré", color: "text-yellow-500" };
  }

  return { status: "not_configured", label: "Non configuré", color: "text-destructive" };
};
