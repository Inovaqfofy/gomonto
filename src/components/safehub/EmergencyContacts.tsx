import { Phone, Shield, Flame, Heart, Headphones } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EmergencyContact {
  name: string;
  number: string;
  icon: React.ReactNode;
  color: string;
}

interface CountryEmergency {
  country: string;
  flag: string;
  contacts: EmergencyContact[];
}

const emergencyByCountry: Record<string, CountryEmergency> = {
  senegal: {
    country: "Sénégal",
    flag: "🇸🇳",
    contacts: [
      { name: "Police", number: "17", icon: <Shield className="h-5 w-5" />, color: "bg-blue-500" },
      { name: "Pompiers", number: "18", icon: <Flame className="h-5 w-5" />, color: "bg-red-500" },
      { name: "SAMU", number: "1515", icon: <Heart className="h-5 w-5" />, color: "bg-green-500" }],
  },
  cote_ivoire: {
    country: "Côte d'Ivoire",
    flag: "🇨🇮",
    contacts: [
      { name: "Police", number: "110", icon: <Shield className="h-5 w-5" />, color: "bg-blue-500" },
      { name: "Pompiers", number: "180", icon: <Flame className="h-5 w-5" />, color: "bg-red-500" },
      { name: "SAMU", number: "185", icon: <Heart className="h-5 w-5" />, color: "bg-green-500" }],
  },
  mali: {
    country: "Mali",
    flag: "🇲🇱",
    contacts: [
      { name: "Police", number: "17", icon: <Shield className="h-5 w-5" />, color: "bg-blue-500" },
      { name: "Pompiers", number: "18", icon: <Flame className="h-5 w-5" />, color: "bg-red-500" },
      { name: "SAMU", number: "15", icon: <Heart className="h-5 w-5" />, color: "bg-green-500" }],
  },
  burkina_faso: {
    country: "Burkina Faso",
    flag: "🇧🇫",
    contacts: [
      { name: "Police", number: "17", icon: <Shield className="h-5 w-5" />, color: "bg-blue-500" },
      { name: "Pompiers", number: "18", icon: <Flame className="h-5 w-5" />, color: "bg-red-500" },
      { name: "SAMU", number: "112", icon: <Heart className="h-5 w-5" />, color: "bg-green-500" }],
  },
  niger: {
    country: "Niger",
    flag: "🇳🇪",
    contacts: [
      { name: "Police", number: "17", icon: <Shield className="h-5 w-5" />, color: "bg-blue-500" },
      { name: "Pompiers", number: "18", icon: <Flame className="h-5 w-5" />, color: "bg-red-500" },
      { name: "Urgences", number: "15", icon: <Heart className="h-5 w-5" />, color: "bg-green-500" }],
  },
  togo: {
    country: "Togo",
    flag: "🇹🇬",
    contacts: [
      { name: "Police", number: "117", icon: <Shield className="h-5 w-5" />, color: "bg-blue-500" },
      { name: "Pompiers", number: "118", icon: <Flame className="h-5 w-5" />, color: "bg-red-500" },
      { name: "SAMU", number: "8200", icon: <Heart className="h-5 w-5" />, color: "bg-green-500" }],
  },
  benin: {
    country: "Bénin",
    flag: "🇧🇯",
    contacts: [
      { name: "Police", number: "117", icon: <Shield className="h-5 w-5" />, color: "bg-blue-500" },
      { name: "Pompiers", number: "118", icon: <Flame className="h-5 w-5" />, color: "bg-red-500" },
      { name: "SAMU", number: "112", icon: <Heart className="h-5 w-5" />, color: "bg-green-500" }],
  },
  guinee_bissau: {
    country: "Guinée-Bissau",
    flag: "🇬🇼",
    contacts: [
      { name: "Police", number: "117", icon: <Shield className="h-5 w-5" />, color: "bg-blue-500" },
      { name: "Pompiers", number: "118", icon: <Flame className="h-5 w-5" />, color: "bg-red-500" },
      { name: "Urgences", number: "119", icon: <Heart className="h-5 w-5" />, color: "bg-green-500" }],
  },
};

interface EmergencyContactsProps {
  country: string;
}

const EmergencyContacts = ({ country }: EmergencyContactsProps) => {
  const countryData = emergencyByCountry[country] || emergencyByCountry.senegal;

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{countryData.flag}</span>
        <h3 className="font-semibold text-lg">{countryData.country}</h3>
      </div>

      <div className="grid gap-3">
        {countryData.contacts.map((contact) => (
          <Button
            key={contact.name}
            variant="outline"
            className="w-full justify-between h-14 text-left"
            onClick={() => handleCall(contact.number)}
          >
            <div className="flex items-center gap-3">
              <div className={`${contact.color} p-2 rounded-full text-white`}>
                {contact.icon}
              </div>
              <span className="font-medium">{contact.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg font-bold">
                {contact.number}
              </Badge>
              <Phone className="h-5 w-5 text-muted-foreground" />
            </div>
          </Button>
        ))}
      </div>

      {/* Inopay Group Assistance */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            Assistance GoMonto 24h/24
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            className="w-full"
            onClick={() => handleCall("+221338001234")}
          >
            <Phone className="h-4 w-4 mr-2" />
            +221 33 800 12 34
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Support technique, remorquage, assistance juridique
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyContacts;
