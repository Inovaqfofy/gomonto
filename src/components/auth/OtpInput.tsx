import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  isSuccess?: boolean;
  disabled?: boolean;
}

const OtpInput = ({ 
  length = 6, 
  onComplete, 
  isLoading = false,
  isError = false,
  isSuccess = false,
  disabled = false 
}: OtpInputProps) => {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    // Reset OTP on error
    if (isError) {
      const timer = setTimeout(() => {
        setOtp(new Array(length).fill(""));
        inputRefs.current[0]?.focus();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isError, length]);

  const handleChange = (index: number, value: string) => {
    if (disabled || isLoading) return;

    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Move to next input if digit entered
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if OTP is complete
    const otpString = newOtp.join("");
    if (otpString.length === length && !newOtp.includes("")) {
      onComplete(otpString);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || isLoading) return;

    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled || isLoading) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);

      // Focus last filled input or next empty
      const lastIndex = Math.min(pastedData.length - 1, length - 1);
      inputRefs.current[lastIndex]?.focus();

      // Check if complete
      if (pastedData.length === length) {
        onComplete(pastedData);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-3 sm:gap-4">
        {otp.map((digit, index) => (
          <div key={index} className="relative">
            <input
              ref={(ref) => (inputRefs.current[index] = ref)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={disabled || isLoading || isSuccess}
              className={cn(
                "w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-bold rounded-xl",
                "border-2 transition-all duration-300 ease-out",
                "focus:outline-none focus:ring-0",
                // Glass effect
                "bg-background/50 backdrop-blur-sm",
                // States
                isSuccess && "border-green-500 bg-green-500/10 text-green-500",
                isError && "border-destructive bg-destructive/10 text-destructive animate-[shake_0.5s_ease-in-out]",
                !isSuccess && !isError && "border-border/50 focus:border-primary focus:bg-primary/5 focus:shadow-[0_0_20px_rgba(139,92,246,0.3)]",
                // Filled state glow
                digit && !isSuccess && !isError && "border-primary/50 bg-primary/5",
                // Disabled
                (disabled || isLoading) && "opacity-50 cursor-not-allowed"
              )}
            />
            {/* Glow effect on focus */}
            <div className={cn(
              "absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300",
              "bg-gradient-to-br from-primary/20 to-secondary/20 blur-xl opacity-0",
              digit && !isError && !isSuccess && "opacity-50"
            )} />
          </div>
        ))}
      </div>

      {/* Status indicators */}
      <div className="h-8 flex items-center justify-center">
        {isSuccess && (
          <div className="flex items-center gap-2 text-green-500 animate-fade-in">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Code vérifié !</span>
          </div>
        )}
        {isError && (
          <div className="flex items-center gap-2 text-destructive animate-fade-in">
            <XCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Code incorrect</span>
          </div>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Vérification...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OtpInput;
