import { useState, useEffect } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import { fr, enUS, pt } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon, MapPin, Users, AlertTriangle, Shield, CheckCircle, X, Loader2, Phone, MessageSquare, Copy, Upload, Clock, ArrowLeft, CreditCard } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DigitalGuaranteeOption } from "@/components/trust/DigitalGuaranteeOption";
import CinetPayCheckout from "@/components/payment/CinetPayCheckout";

interface BookingModalProps {
  vehicle: {
    id: string;
    brand: string;
    model: string;
    daily_price: number;
    location_city: string;
    owner_id: string;
    seats: number;
    guarantee_eligible?: boolean;
    daily_guarantee_rate?: number;
  };
  userId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
  onLoginRequired?: () => void;
}

type PaymentMethod = "mtn_momo" | "moov_money" | "orange_money" | "wave";

interface OwnerPaymentSettings {
  deposit_type: "percentage" | "fixed";
  deposit_value: number;
  deposit_management_mode: "direct" | "gomonto";
  mtn_momo_enabled: boolean;
  mtn_momo_phone: string;
  mtn_momo_name: string;
  moov_money_enabled: boolean;
  moov_money_phone: string;
  moov_money_name: string;
  orange_money_enabled: boolean;
  orange_money_phone: string;
  orange_money_name: string;
  wave_enabled: boolean;
  wave_phone: string;
  wave_name: string;
  wave_link: string;
  payment_instructions: string;
}

const paymentMethodsConfig = [
  { id: "wave" as PaymentMethod, name: "Wave", color: "from-cyan-400 to-cyan-600", logo: "🌊" },
  { id: "orange_money" as PaymentMethod, name: "Orange Money", color: "from-orange-400 to-orange-600", logo: "🟠" },
  { id: "mtn_momo" as PaymentMethod, name: "MTN MoMo", color: "from-yellow-400 to-yellow-600", logo: "🟡" },
  { id: "moov_money" as PaymentMethod, name: "Moov Money", color: "from-blue-400 to-blue-600", logo: "🔵" }];

type BookingStep = "dates" | "payment" | "cinetpay" | "submit-proof" | "waiting";
type PaymentMode = "manual" | "cinetpay";

const BookingModal = ({ vehicle, userId, onClose, onSuccess, onLoginRequired }: BookingModalProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'pt' ? pt : i18n.language === 'en' ? enUS : fr;
  const [step, setStep] = useState<BookingStep>("dates");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cinetpay");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [ownerSettings, setOwnerSettings] = useState<OwnerPaymentSettings | null>(null);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [hasDigitalGuarantee, setHasDigitalGuarantee] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch owner payment settings
      const { data: settings } = await supabase
        .from("owner_payment_settings")
        .select("*")
        .eq("owner_id", vehicle.owner_id)
        .single();

      if (settings) {
        setOwnerSettings({
          deposit_type: settings.deposit_type,
          deposit_value: settings.deposit_value,
          deposit_management_mode: (settings.deposit_management_mode as "direct" | "gomonto") || "gomonto",
          mtn_momo_enabled: settings.mtn_momo_enabled || false,
          mtn_momo_phone: settings.mtn_momo_phone || "",
          mtn_momo_name: settings.mtn_momo_name || "",
          moov_money_enabled: settings.moov_money_enabled || false,
          moov_money_phone: settings.moov_money_phone || "",
          moov_money_name: settings.moov_money_name || "",
          orange_money_enabled: settings.orange_money_enabled || false,
          orange_money_phone: settings.orange_money_phone || "",
          orange_money_name: settings.orange_money_name || "",
          wave_enabled: settings.wave_enabled || false,
          wave_phone: settings.wave_phone || "",
          wave_name: settings.wave_name || "",
          wave_link: settings.wave_link || "",
          payment_instructions: settings.payment_instructions || "",
        });
      } else {
        // Default settings if owner hasn't configured
        setOwnerSettings({
          deposit_type: "percentage",
          deposit_value: 20,
          deposit_management_mode: "gomonto",
          mtn_momo_enabled: false,
          mtn_momo_phone: "",
          mtn_momo_name: "",
          moov_money_enabled: false,
          moov_money_phone: "",
          moov_money_name: "",
          orange_money_enabled: false,
          orange_money_phone: "",
          orange_money_name: "",
          wave_enabled: false,
          wave_phone: "",
          wave_name: "",
          wave_link: "",
          payment_instructions: "",
        });
      }

      // Fetch blocked dates
      const { data: availability } = await supabase
        .from("vehicle_availability")
        .select("blocked_date")
        .eq("vehicle_id", vehicle.id);

      if (availability) {
        setBlockedDates(availability.map((a) => new Date(a.blocked_date)));
      }

      // Fetch existing reservations
      const { data: reservations } = await supabase
        .from("reservations")
        .select("start_date, end_date")
        .eq("vehicle_id", vehicle.id)
        .in("status", ["guaranteed", "confirmed", "pending"]);

      if (reservations) {
        const reservedDates: Date[] = [];
        reservations.forEach((r) => {
          const start = new Date(r.start_date);
          const end = new Date(r.end_date);
          let current = start;
          while (current <= end) {
            reservedDates.push(new Date(current));
            current = addDays(current, 1);
          }
        });
        setBlockedDates((prev) => [...prev, ...reservedDates]);
      }

      // Fetch user profile for email only if logged in
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, phone")
          .eq("user_id", userId)
          .single();

        if (profile) {
          setUserEmail(profile.email || "");
          if (profile.phone) setPhone(profile.phone);
        }
      }
    };

    fetchData();
  }, [vehicle.owner_id, vehicle.id, userId]);

  // Handle proceeding to payment - check login
  const handleProceedToPayment = () => {
    if (!userId) {
      // User not logged in - trigger login flow
      if (onLoginRequired) {
        onLoginRequired();
      }
      return;
    }
    setStep("payment");
  };

  const totalDays = startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 0;
  const totalPrice = totalDays * vehicle.daily_price;
  const dailyGuaranteeRate = vehicle.daily_guarantee_rate || 1500;
  const guaranteeCost = totalDays * dailyGuaranteeRate;
  const baseDepositAmount = ownerSettings
    ? ownerSettings.deposit_type === "percentage"
      ? Math.round((totalPrice * ownerSettings.deposit_value) / 100)
      : ownerSettings.deposit_value
    : 0;
  // If digital guarantee is selected, no deposit needed - pay guarantee cost instead
  const depositAmount = hasDigitalGuarantee ? guaranteeCost : baseDepositAmount;
  const isGuaranteeEligible = vehicle.guarantee_eligible !== false;

  const availablePaymentMethods = paymentMethodsConfig.filter((m) => {
    if (!ownerSettings) return false;
    const enabledKey = `${m.id}_enabled` as keyof OwnerPaymentSettings;
    const phoneKey = `${m.id}_phone` as keyof OwnerPaymentSettings;
    return ownerSettings[enabledKey] && ownerSettings[phoneKey];
  });

  const isDateDisabled = (date: Date) => {
    return blockedDates.some(
      (blocked) =>
        blocked.getFullYear() === date.getFullYear() &&
        blocked.getMonth() === date.getMonth() &&
        blocked.getDate() === date.getDate()
    );
  };

  const selectedMethodDetails = selectedMethod
    ? {
        phone: ownerSettings?.[`${selectedMethod}_phone` as keyof OwnerPaymentSettings] as string,
        name: ownerSettings?.[`${selectedMethod}_name` as keyof OwnerPaymentSettings] as string,
        config: paymentMethodsConfig.find((m) => m.id === selectedMethod),
      }
    : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t('common.copied'), description: t('booking.numberCopied') });
  };

  const handleCreateReservation = async () => {
    // For manual mode, require selected method
    if (paymentMode === "manual" && !selectedMethod) return;
    if (!startDate || !endDate) return;

    setIsSubmitting(true);

    try {
      // Determine deposit mode based on owner settings and payment mode
      const depositMode = hasDigitalGuarantee 
        ? "digital_guarantee" 
        : (paymentMode === "cinetpay" && ownerSettings?.deposit_management_mode === "gomonto")
          ? "gomonto"
          : "direct";

      const { data: reservation, error } = await supabase
        .from("reservations")
        .insert({
          vehicle_id: vehicle.id,
          owner_id: vehicle.owner_id,
          renter_id: userId,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          daily_price: vehicle.daily_price,
          total_days: totalDays,
          total_price: totalPrice,
          deposit_amount: hasDigitalGuarantee ? 0 : baseDepositAmount,
          deposit_paid: false,
          payment_method: paymentMode === "cinetpay" ? "cinetpay" : selectedMethod,
          status: "pending",
          is_guaranteed: false,
          renter_phone: phone,
          renter_message: message,
          has_digital_guarantee: hasDigitalGuarantee,
          guarantee_cost: hasDigitalGuarantee ? guaranteeCost : 0,
          deposit_mode: depositMode,
        } as any)
        .select()
        .single();

      if (error) throw error;

      setReservationId(reservation.id);
      
      // If CinetPay mode, go to CinetPay step
      if (paymentMode === "cinetpay") {
        setStep("cinetpay");
      } else {
        setStep("submit-proof");
      }
    } catch (error: any) {
      console.error("Reservation creation failed:", {
        error,
        vehicle_id: vehicle.id,
        owner_id: vehicle.owner_id,
        renter_id: userId,
        paymentMode,
        selectedMethod,
        dates: { startDate, endDate },
      });
      
      const errorMessage = error?.message || error?.code || t('booking.createError');
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCinetPaySuccess = async (transactionId: string) => {
    if (!reservationId) return;
    
    // Update reservation with payment info
    await supabase
      .from("reservations")
      .update({
        payment_reference: transactionId,
        deposit_paid: true,
        status: "guaranteed",
      })
      .eq("id", reservationId);

    setStep("waiting");
    toast({
      title: "Paiement réussi !",
      description: "Votre réservation a été confirmée.",
    });
    
    setTimeout(() => {
      onSuccess();
    }, 2000);
  };

  const handleSubmitPaymentProof = async () => {
    if (!reservationId || !paymentReference) return;

    setIsSubmitting(true);

    try {
      // Update reservation with payment proof
      const { error: updateError } = await supabase
        .from("reservations")
        .update({
          payment_reference_submitted: paymentReference,
          payment_submitted_at: new Date().toISOString(),
        })
        .eq("id", reservationId);

      if (updateError) throw updateError;

      // Create notification for owner
      await supabase.from("notifications").insert({
        user_id: vehicle.owner_id,
        type: "payment_submitted",
        title: t('booking.paymentSubmittedTitle'),
        message: t('booking.paymentSubmittedMessage', { amount: depositAmount.toLocaleString(), brand: vehicle.brand, model: vehicle.model }),
        data: { reservation_id: reservationId, amount: depositAmount },
      });

      setStep("waiting");
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('booking.submitPaymentError'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto border border-glass-border relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-destructive/10 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Glow Effects */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6">
          {/* Step: Dates */}
          {step === "dates" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">{t('booking.reserveVehicle')}</h2>
                <p className="text-muted-foreground text-sm">
                  {vehicle.brand} {vehicle.model} • {vehicle.location_city}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">{t('booking.startDate')}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        "w-full flex items-center gap-2 px-4 py-3 rounded-xl glass border border-glass-border text-left",
                        !startDate && "text-muted-foreground"
                      )}>
                        <CalendarIcon className="w-4 h-4" />
                        {startDate ? format(startDate, "d MMM", { locale: dateLocale }) : t('common.choose')}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        disabled={(date) => date < new Date() || isDateDisabled(date)}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-2">{t('booking.endDate')}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        "w-full flex items-center gap-2 px-4 py-3 rounded-xl glass border border-glass-border text-left",
                        !endDate && "text-muted-foreground"
                      )}>
                        <CalendarIcon className="w-4 h-4" />
                        {endDate ? format(endDate, "d MMM", { locale: dateLocale }) : t('common.choose')}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => !startDate || date < startDate || isDateDisabled(date)}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">{t('booking.yourPhone')}</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+221 77 123 45 67"
                    className="w-full pl-11 pr-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">{t('booking.messageToOwner')}</label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-3 w-4 h-4 text-muted-foreground" />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    placeholder={t('booking.introduceBriefly')}
                    className="w-full pl-11 pr-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Digital Guarantee Option */}
              {totalDays > 0 && isGuaranteeEligible && (
                <DigitalGuaranteeOption
                  totalDays={totalDays}
                  depositAmount={baseDepositAmount}
                  dailyGuaranteeRate={dailyGuaranteeRate}
                  isSelected={hasDigitalGuarantee}
                  onToggle={setHasDigitalGuarantee}
                  isEligible={isGuaranteeEligible}
                />
              )}

              {/* Price Summary */}
              {totalDays > 0 && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{totalDays} {t('common.days', { count: totalDays })} × {formatCurrency(vehicle.daily_price)}</span>
                    <span>{formatCurrency(totalPrice)}</span>
                  </div>
                  {hasDigitalGuarantee ? (
                    <div className="flex justify-between font-semibold pt-2 border-t border-glass-border">
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        {t('guarantee.title', 'Garantie GoMonto')}
                      </span>
                      <span className="text-emerald-400">{formatCurrency(guaranteeCost)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between font-semibold pt-2 border-t border-glass-border">
                        <span>{t('booking.depositToPay')} ({ownerSettings?.deposit_value}{ownerSettings?.deposit_type === "percentage" ? "%" : " FCFA"})</span>
                        <span className="gradient-text">{formatCurrency(depositAmount)}</span>
                      </div>
                      {/* Show deposit mode info with fee warning */}
                      {ownerSettings?.deposit_management_mode === "gomonto" && (
                        <div className="space-y-1 mt-1">
                          <div className="flex items-center gap-2 text-xs text-emerald-600">
                            <Shield className="w-3 h-3" />
                            <span>Caution sécurisée par GoMonto - Remboursement garanti</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground pl-5">
                            + Frais de service de 5% (non remboursables)
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <button
                onClick={handleProceedToPayment}
                disabled={!startDate || !endDate || !phone}
                className="w-full btn-primary-glow py-3 rounded-xl font-semibold text-primary-foreground disabled:opacity-50"
              >
                <span className="relative z-10">{t('booking.continueToPayment')}</span>
              </button>
            </div>
          )}

          {/* Step: Payment Method Selection */}
          {step === "payment" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep("dates")} className="w-8 h-8 rounded-full glass flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">{t('booking.payDeposit')}</h2>
                  <p className="text-muted-foreground text-sm">
                    {depositAmount.toLocaleString()} FCFA {t('booking.toSendToOwner')}
                  </p>
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div className="space-y-3">
                <label className="block text-sm text-muted-foreground">Mode de paiement</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMode("cinetpay")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                      paymentMode === "cinetpay"
                        ? "bg-primary/10 border-2 border-primary"
                        : "glass border border-glass-border hover:border-primary/30"
                    )}
                  >
                    <CreditCard className="w-6 h-6 text-primary" />
                    <span className="text-sm font-medium">Payer maintenant</span>
                    <span className="text-xs text-muted-foreground">CinetPay sécurisé</span>
                  </button>
                  <button
                    onClick={() => setPaymentMode("manual")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                      paymentMode === "manual"
                        ? "bg-primary/10 border-2 border-primary"
                        : "glass border border-glass-border hover:border-primary/30"
                    )}
                  >
                    <Phone className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm font-medium">Transfert manuel</span>
                    <span className="text-xs text-muted-foreground">Mobile Money P2P</span>
                  </button>
                </div>
              </div>

              {/* CinetPay Mode Info */}
              {paymentMode === "cinetpay" && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 animate-fade-in">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    <span className="font-semibold text-green-400">Paiement sécurisé</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Payez directement via Orange Money, MTN MoMo, Wave ou carte bancaire. 
                    Votre réservation sera confirmée automatiquement.
                  </p>
                </div>
              )}

              {/* Manual Mode - Show Mobile Money Options */}
              {paymentMode === "manual" && (
                <>
                  {availablePaymentMethods.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                      <p className="text-sm text-muted-foreground">
                        {t('booking.noPaymentMethods')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-sm text-muted-foreground">{t('booking.choosePaymentMethod')}</label>
                      <div className="grid grid-cols-2 gap-3">
                        {availablePaymentMethods.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setSelectedMethod(method.id)}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-xl transition-all",
                              selectedMethod === method.id
                                ? "bg-primary/10 border-2 border-primary"
                                : "glass border border-glass-border hover:border-primary/30"
                            )}
                          >
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${method.color} flex items-center justify-center text-lg`}>
                              {method.logo}
                            </div>
                            <span className="text-sm font-medium">{method.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Method Details */}
                  {selectedMethodDetails && (
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 animate-fade-in">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${selectedMethodDetails.config?.color} flex items-center justify-center text-lg`}>
                          {selectedMethodDetails.config?.logo}
                        </div>
                        <div>
                          <p className="font-semibold">{selectedMethodDetails.name}</p>
                          <p className="text-sm text-muted-foreground">{t('booking.sendExactly')} {depositAmount.toLocaleString()} FCFA</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 mb-3">
                        <span className="text-lg font-mono font-bold">{selectedMethodDetails.phone}</span>
                        <button
                          onClick={() => copyToClipboard(selectedMethodDetails.phone)}
                          className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>

                      {ownerSettings?.wave_link && selectedMethod === "wave" && (
                        <a
                          href={ownerSettings.wave_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full py-3 rounded-xl bg-cyan-500 text-white text-center font-semibold mb-3"
                        >
                          {t('booking.openWave')} →
                        </a>
                      )}

                      {ownerSettings?.payment_instructions && (
                        <p className="text-sm text-muted-foreground italic">
                          "{ownerSettings.payment_instructions}"
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              <button
                onClick={handleCreateReservation}
                disabled={(paymentMode === "manual" && !selectedMethod) || isSubmitting}
                className="w-full btn-primary-glow py-3 rounded-xl font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : paymentMode === "cinetpay" ? (
                  <>
                    <CreditCard className="w-5 h-5 relative z-10" />
                    <span className="relative z-10">Payer {formatCurrency(depositAmount)}</span>
                  </>
                ) : (
                  <span className="relative z-10">{t('booking.paymentDone')}</span>
                )}
              </button>
            </div>
          )}

          {/* Step: CinetPay Payment */}
          {step === "cinetpay" && reservationId && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setStep("payment")} className="w-8 h-8 rounded-full glass flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-xl font-bold">Paiement sécurisé</h2>
              </div>
              
              <CinetPayCheckout
                amount={depositAmount}
                currency="XOF"
                description={`Réservation ${vehicle.brand} ${vehicle.model} - ${totalDays} jours`}
                customerName="Client GoMonto"
                customerEmail={userEmail}
                customerPhone={phone}
                reservationId={reservationId}
                onSuccess={handleCinetPaySuccess}
                onError={(error) => toast({ title: "Erreur", description: error, variant: "destructive" })}
                onCancel={() => setStep("payment")}
              />
            </div>
          )}

          {/* Step: Submit Payment Proof */}
          {step === "submit-proof" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep("payment")} className="w-8 h-8 rounded-full glass flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">{t('booking.confirmPayment')}</h2>
                  <p className="text-muted-foreground text-sm">
                    {t('booking.enterTransactionRef')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-400 font-medium mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t('common.important')}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('booking.enterRefInstructions', { provider: selectedMethodDetails?.config?.name })}
                </p>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  {t('booking.transactionReference')}
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={t('booking.transactionPlaceholder')}
                  className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{t('booking.amountSent')}</span>
                  <span className="font-semibold">{depositAmount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('booking.paymentMethod')}</span>
                  <span>{selectedMethodDetails?.config?.name}</span>
                </div>
              </div>

              <button
                onClick={handleSubmitPaymentProof}
                disabled={!paymentReference || isSubmitting}
                className="w-full btn-primary-glow py-3 rounded-xl font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 relative z-10" />
                    <span className="relative z-10">{t('booking.confirmMyPayment')}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step: Waiting for Owner Confirmation */}
          {step === "waiting" && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-amber-500/20">
                <Clock className="w-10 h-10 text-amber-400 animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {t('booking.awaitingConfirmation')}
              </div>

              <div>
                <h2 className="text-xl font-bold mb-2">{t('booking.paymentSubmitted')}</h2>
                <p className="text-muted-foreground text-sm">
                  {t('booking.ownerWillVerify')}
                </p>
              </div>

              {/* Transaction Details */}
              <div className="glass p-4 rounded-xl border border-glass-border text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('booking.vehicle')}</span>
                  <span>{vehicle.brand} {vehicle.model}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('booking.dates')}</span>
                  <span>{format(startDate!, "d MMM", { locale: dateLocale })} - {format(endDate!, "d MMM", { locale: dateLocale })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('common.total')}</span>
                  <span>{totalPrice.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-glass-border">
                  <span className="text-muted-foreground">{t('booking.depositSent')}</span>
                  <span className="text-amber-400 font-semibold">{depositAmount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('booking.reference')}</span>
                  <span className="font-mono text-xs">{paymentReference}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  {t('booking.directPayment')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('booking.directPaymentNote', { provider: selectedMethodDetails?.config?.name })}
                </p>
              </div>

              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full btn-primary-glow py-3 rounded-xl font-semibold text-primary-foreground flex items-center justify-center gap-2"
              >
                <span className="relative z-10">{t('common.close')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;