import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

interface StructuredDataProps {
  type: "organization" | "localBusiness" | "vehicleRental" | "faq" | "breadcrumb" | "webpage";
  data?: Record<string, unknown>;
}

const StructuredData = ({ type, data }: StructuredDataProps) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const getOrganizationSchema = () => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://gomonto.com/#organization",
    "name": "GoMonto",
    "alternateName": ["Go Monto", "GoMonto Location", "GoMonto Rental"],
    "url": "https://gomonto.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://gomonto.com/logo.png",
      "width": 512,
      "height": 512
    },
    "image": "https://gomonto.com/logo.png",
    "description": currentLang === "fr" 
      ? "GoMonto - La plateforme de location de véhicules N°1 en Afrique de l'Ouest. Location de voitures, SUV, 4x4, pickups avec ou sans chauffeur en Côte d'Ivoire, Sénégal, Mali, Burkina Faso, Bénin, Togo, Niger et Guinée-Bissau."
      : currentLang === "pt"
      ? "GoMonto - A plataforma de aluguer de veículos N°1 na África Ocidental. Aluguer de carros, SUV, 4x4, pickups com ou sem motorista na Costa do Marfim, Senegal, Mali, Burkina Faso, Benim, Togo, Níger e Guiné-Bissau."
      : "GoMonto - The #1 vehicle rental platform in West Africa. Car, SUV, 4x4, pickup rentals with or without driver in Ivory Coast, Senegal, Mali, Burkina Faso, Benin, Togo, Niger and Guinea-Bissau.",
    "foundingDate": "2024",
    "founder": {
      "@type": "Person",
      "name": "GoMonto Team"
    },
    "sameAs": [
      "https://facebook.com/gomonto",
      "https://twitter.com/gomonto",
      "https://instagram.com/gomonto",
      "https://linkedin.com/company/gomonto"
    ],
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "telephone": "+225-XX-XX-XX-XX",
        "contactType": "customer service",
        "availableLanguage": ["French", "English", "Portuguese"],
        "areaServed": ["CI", "SN", "ML", "BF", "BJ", "TG", "NE", "GW"]
      }
    ],
    "areaServed": [
      { "@type": "Country", "name": "Côte d'Ivoire" },
      { "@type": "Country", "name": "Senegal" },
      { "@type": "Country", "name": "Mali" },
      { "@type": "Country", "name": "Burkina Faso" },
      { "@type": "Country", "name": "Benin" },
      { "@type": "Country", "name": "Togo" },
      { "@type": "Country", "name": "Niger" },
      { "@type": "Country", "name": "Guinea-Bissau" }
    ],
    "knowsLanguage": ["fr", "en", "pt"]
  });

  const getLocalBusinessSchema = () => ({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://gomonto.com/#localbusiness",
    "name": "GoMonto",
    "image": "https://gomonto.com/logo.png",
    "url": "https://gomonto.com",
    "telephone": "+225-XX-XX-XX-XX",
    "priceRange": "$$",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Abidjan",
      "addressRegion": "Lagunes",
      "addressCountry": "CI"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 5.3600,
      "longitude": -4.0083
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "00:00",
        "closes": "23:59"
      }
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "500"
    }
  });

  const getVehicleRentalSchema = () => ({
    "@context": "https://schema.org",
    "@type": "AutoRental",
    "@id": "https://gomonto.com/#autorental",
    "name": "GoMonto - Location de Véhicules",
    "description": currentLang === "fr"
      ? "Location de voitures, SUV, 4x4, pickups et véhicules de luxe avec ou sans chauffeur dans toute la zone UEMOA"
      : "Car, SUV, 4x4, pickup and luxury vehicle rentals with or without driver across the UEMOA zone",
    "url": "https://gomonto.com",
    "image": "https://gomonto.com/logo.png",
    "currenciesAccepted": "XOF",
    "paymentAccepted": ["Cash", "Mobile Money", "Wave", "Orange Money", "MTN MoMo", "Credit Card"],
    "availableLanguage": ["French", "English", "Portuguese"],
    "areaServed": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": 8.0,
        "longitude": -2.0
      },
      "geoRadius": "2000 km"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Véhicules disponibles",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Car",
            "name": "Berlines et citadines",
            "category": "Sedan"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Car",
            "name": "SUV et Crossovers",
            "category": "SUV"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Car",
            "name": "4x4 et tout-terrain",
            "category": "4x4"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Car",
            "name": "Pickups",
            "category": "Pickup"
          }
        }
      ]
    }
  });

  const getFAQSchema = () => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": currentLang === "fr" ? "Comment louer un véhicule sur GoMonto ?" : "How to rent a vehicle on GoMonto?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": currentLang === "fr" 
            ? "Créez un compte, parcourez nos véhicules, sélectionnez vos dates et réservez en ligne. Paiement sécurisé par Mobile Money ou carte bancaire."
            : "Create an account, browse our vehicles, select your dates and book online. Secure payment via Mobile Money or credit card."
        }
      },
      {
        "@type": "Question",
        "name": currentLang === "fr" ? "Quels pays couvre GoMonto ?" : "What countries does GoMonto cover?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": currentLang === "fr"
            ? "GoMonto opère dans toute la zone UEMOA : Côte d'Ivoire, Sénégal, Mali, Burkina Faso, Bénin, Togo, Niger et Guinée-Bissau."
            : "GoMonto operates across the entire UEMOA zone: Ivory Coast, Senegal, Mali, Burkina Faso, Benin, Togo, Niger and Guinea-Bissau."
        }
      },
      {
        "@type": "Question",
        "name": currentLang === "fr" ? "Puis-je louer avec chauffeur ?" : "Can I rent with a driver?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": currentLang === "fr"
            ? "Oui ! GoMonto propose des chauffeurs certifiés et professionnels pour accompagner votre location."
            : "Yes! GoMonto offers certified and professional drivers to accompany your rental."
        }
      },
      {
        "@type": "Question",
        "name": currentLang === "fr" ? "Comment devenir loueur sur GoMonto ?" : "How to become a rental owner on GoMonto?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": currentLang === "fr"
            ? "Inscrivez-vous, ajoutez vos véhicules avec photos et tarifs, et commencez à recevoir des réservations. GoMonto gère les paiements sécurisés."
            : "Sign up, add your vehicles with photos and rates, and start receiving bookings. GoMonto handles secure payments."
        }
      }
    ]
  });

  const getBreadcrumbSchema = () => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": data?.breadcrumbs || [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Accueil",
        "item": "https://gomonto.com"
      }
    ]
  });

  const getWebPageSchema = () => ({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `https://gomonto.com${data?.path || "/"}#webpage`,
    "url": `https://gomonto.com${data?.path || "/"}`,
    "name": data?.title || "GoMonto",
    "description": data?.description || "",
    "isPartOf": {
      "@id": "https://gomonto.com/#website"
    },
    "about": {
      "@id": "https://gomonto.com/#organization"
    },
    "inLanguage": currentLang === "fr" ? "fr-FR" : currentLang === "pt" ? "pt-PT" : "en-GB"
  });

  const getSchema = () => {
    switch (type) {
      case "organization":
        return getOrganizationSchema();
      case "localBusiness":
        return getLocalBusinessSchema();
      case "vehicleRental":
        return getVehicleRentalSchema();
      case "faq":
        return getFAQSchema();
      case "breadcrumb":
        return getBreadcrumbSchema();
      case "webpage":
        return getWebPageSchema();
      default:
        return null;
    }
  };

  const schema = getSchema();

  if (!schema) return null;

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export default StructuredData;
