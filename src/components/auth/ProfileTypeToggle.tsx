import { Car, Key } from "lucide-react";

export type ProfileType = "locataire" | "loueur";

interface ProfileTypeToggleProps {
  value: ProfileType;
  onChange: (value: ProfileType) => void;
}

const ProfileTypeToggle = ({ value, onChange }: ProfileTypeToggleProps) => {
  return (
    <div>
      <label className="block text-sm text-muted-foreground mb-2">
        Je souhaite
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange("locataire")}
          className={`relative p-4 rounded-xl border transition-all duration-300 ${
            value === "locataire"
              ? "border-primary bg-primary/10 shadow-lg"
              : "border-glass-border glass hover:border-primary/30"
          }`}
        >
          {value === "locataire" && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 animate-pulse" />
          )}
          <div className="relative flex flex-col items-center gap-2">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                value === "locataire"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Key className="w-6 h-6" />
            </div>
            <span className="font-semibold">Louer</span>
            <span className="text-xs text-muted-foreground">
              Je cherche un véhicule
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange("loueur")}
          className={`relative p-4 rounded-xl border transition-all duration-300 ${
            value === "loueur"
              ? "border-secondary bg-secondary/10 shadow-lg"
              : "border-glass-border glass hover:border-secondary/30"
          }`}
        >
          {value === "loueur" && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-secondary/20 to-primary/20 animate-pulse" />
          )}
          <div className="relative flex flex-col items-center gap-2">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                value === "loueur"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Car className="w-6 h-6" />
            </div>
            <span className="font-semibold">Proposer</span>
            <span className="text-xs text-muted-foreground">
              Je propose mon véhicule
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ProfileTypeToggle;
