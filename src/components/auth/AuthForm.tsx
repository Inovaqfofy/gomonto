import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Mail, Lock, User, Phone, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";
import CountrySelect from "./CountrySelect";
import ProfileTypeToggle, { type ProfileType } from "./ProfileTypeToggle";
import OtpInput from "./OtpInput";
import logo from "@/assets/logo.png";

// Disposable email domains list
const disposableEmailDomains = [
  "tempmail.com", "throwaway.email", "guerrillamail.com", "mailinator.com",
  "10minutemail.com", "yopmail.com", "trashmail.com", "fakeinbox.com",
  "sharklasers.com", "guerrillamail.info", "grr.la", "mailnesia.com",
  "getnada.com", "temp-mail.org", "maildrop.cc", "mintemail.com"
];

// Country code mapping for the send-otp function
const countryCodeMapping: Record<string, string> = {
  "SN": "senegal",
  "CI": "cote_ivoire",
  "BF": "burkina_faso",
  "ML": "mali",
  "TG": "togo",
  "BJ": "benin",
  "NE": "niger",
  "GW": "guinee_bissau"
};

const emailSchema = z.string()
  .email("Format d'email invalide")
  .max(255)
  .refine((email) => {
    const domain = email.split("@")[1]?.toLowerCase();
    return !disposableEmailDomains.includes(domain);
  }, "Les emails jetables ne sont pas autorisés");

const profileSchema = z.object({
  fullName: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  phone: z.string().min(8, "Numéro de téléphone invalide").max(20),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

const signInSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type AuthMode = "signin" | "signup";
type SignupStep = "email" | "otp" | "profile";

const AuthForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [signupStep, setSignupStep] = useState<SignupStep>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("SN");
  const [profileType, setProfileType] = useState<ProfileType>("locataire");

  // OTP state
  const [otpError, setOtpError] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    try {
      emailSchema.parse(email);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ email: error.errors[0].message });
      }
      return;
    }

    setIsLoading(true);
    try {
      const countryValue = countryCodeMapping[country] || "senegal";
      
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { email: email.toLowerCase(), country: countryValue },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Erreur lors de l'envoi");
      }

      toast({ title: "Code envoyé !", description: `Un code de vérification a été envoyé à ${email}` });
      setSignupStep("otp");
      setCountdown(60);
    } catch (error: any) {
      console.error("OTP send error:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setIsLoading(true);
    setOtpError(false);

    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { email: email.toLowerCase(), otp },
      });

      if (error || data?.error) {
        setOtpError(true);
        toast({ title: "Code incorrect", description: data?.error || "Veuillez réessayer", variant: "destructive" });
        return;
      }

      setOtpSuccess(true);
      toast({ title: "Email vérifié !", description: "Finalisez votre inscription" });
      setTimeout(() => setSignupStep("profile"), 1000);
    } catch (error: any) {
      setOtpError(true);
      console.error("OTP verify error:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setOtpError(false);
    setOtpSuccess(false);
    await handleSendOtp();
  };

  const handleFinalizeSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      profileSchema.parse({ fullName, phone, password });
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      }
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName, phone, country, profile_type: profileType },
        },
      });

      if (error) throw error;

      toast({ title: "Compte créé !", description: "Bienvenue sur GoMonto !" });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      signInSchema.parse({ email, password });
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      }
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Erreur", description: error.message.includes("Invalid") ? "Email ou mot de passe invalide" : error.message, variant: "destructive" });
      } else {
        toast({ title: "Connexion réussie", description: "Bienvenue !" });
        navigate("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render step indicator for signup (3 steps with OTP)
  const renderStepIndicator = () => {
    const steps = ["email", "otp", "profile"];
    const currentIndex = steps.indexOf(signupStep);
    
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              signupStep === step ? "bg-primary text-primary-foreground scale-110" :
              currentIndex > i ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {i + 1}
            </div>
            {i < steps.length - 1 && <div className={`w-8 h-0.5 mx-1 ${currentIndex > i ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <img src={logo} alt="GoMonto" className="h-10 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">
          {mode === "signin" ? t('auth.welcomeBack') : 
            signupStep === "profile" ? t('auth.finalizeProfile') : 
            signupStep === "otp" ? "Vérification" : t('auth.joinGomonto')}
        </h1>
        <p className="text-muted-foreground">
          {mode === "signin" ? t('auth.signIn') : 
            signupStep === "profile" ? t('auth.oneMoreStep') : 
            signupStep === "otp" ? `Code envoyé à ${email}` : t('auth.createSecureAccount')}
        </p>
      </div>

      <div className="glass-card p-6 md:p-8 border border-glass-border relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl" />

        {mode === "signup" && renderStepIndicator()}

        {/* Sign In Form */}
        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="relative space-y-5">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder')}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl glass border transition-colors focus:outline-none focus:border-primary ${errors.email ? "border-destructive" : "border-glass-border"}`} />
              </div>
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className={`w-full pl-12 pr-12 py-3 rounded-xl glass border transition-colors focus:outline-none focus:border-primary ${errors.password ? "border-destructive" : "border-glass-border"}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full btn-primary-glow py-3 rounded-xl font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.signIn')}
            </button>
          </form>
        )}

        {/* Signup Step 1: Email */}
        {mode === "signup" && signupStep === "email" && (
          <div className="relative space-y-5">
            <CountrySelect value={country} onChange={setCountry} />
            <div>
              <label className="block text-sm text-muted-foreground mb-2">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder')}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl glass border transition-colors focus:outline-none focus:border-primary ${errors.email ? "border-destructive" : "border-glass-border"}`} />
              </div>
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
            </div>
            <button onClick={handleSendOtp} disabled={!email || isLoading} className="w-full btn-primary-glow py-3 rounded-xl font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('common.next')} <ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>
        )}

        {/* Signup Step 2: OTP */}
        {mode === "signup" && signupStep === "otp" && (
          <div className="relative space-y-6">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                Entrez le code à 6 chiffres envoyé à votre email
              </p>
            </div>
            <OtpInput 
              onComplete={handleVerifyOtp} 
              isLoading={isLoading} 
              isError={otpError} 
              isSuccess={otpSuccess} 
            />
            <div className="text-center">
              <button 
                onClick={handleResendOtp} 
                disabled={countdown > 0 || isLoading} 
                className="text-sm text-muted-foreground hover:text-primary disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                {countdown > 0 ? `Renvoyer dans ${countdown}s` : "Renvoyer le code"}
              </button>
            </div>
            <button 
              onClick={() => {
                setSignupStep("email");
                setOtpError(false);
                setOtpSuccess(false);
              }} 
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Modifier l'email
            </button>
          </div>
        )}

        {/* Signup Step 3: Profile */}
        {mode === "signup" && signupStep === "profile" && (
          <form onSubmit={handleFinalizeSignup} className="relative space-y-5">
            <ProfileTypeToggle value={profileType} onChange={setProfileType} />
            <div>
              <label className="block text-sm text-muted-foreground mb-2">{t('auth.fullName')}</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('auth.fullNamePlaceholder')}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl glass border transition-colors focus:outline-none focus:border-primary ${errors.fullName ? "border-destructive" : "border-glass-border"}`} />
              </div>
              {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">{t('auth.phone')}</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 77 123 45 67"
                  className={`w-full pl-12 pr-4 py-3 rounded-xl glass border transition-colors focus:outline-none focus:border-primary ${errors.phone ? "border-destructive" : "border-glass-border"}`} />
              </div>
              {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className={`w-full pl-12 pr-12 py-3 rounded-xl glass border transition-colors focus:outline-none focus:border-primary ${errors.password ? "border-destructive" : "border-glass-border"}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="w-full btn-primary-glow py-3 rounded-xl font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.createAccount')}
            </button>
          </form>
        )}

        {/* Toggle Mode */}
        <div className="relative mt-6 pt-6 border-t border-glass-border text-center">
          <p className="text-muted-foreground">
            {mode === "signin" ? t('auth.noAccount') : t('auth.haveAccount')}{" "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setSignupStep("email");
                setErrors({});
                setOtpError(false);
                setOtpSuccess(false);
              }}
              className="text-primary font-semibold hover:underline"
            >
              {mode === "signin" ? t('auth.createAccount') : t('auth.signIn')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
