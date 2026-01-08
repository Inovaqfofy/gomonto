import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import StructuredData from "./seo/StructuredData";

interface SEOHeadProps {
  titleKey?: string;
  descriptionKey?: string;
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  keywords?: string;
  type?: "website" | "article" | "product";
  noIndex?: boolean;
  breadcrumbs?: Array<{ name: string; item: string; position: number }>;
}

const SEOHead = ({ 
  titleKey, 
  descriptionKey, 
  title: customTitle,
  description: customDescription,
  path = "",
  image = "/logo.png",
  keywords,
  type = "website",
  noIndex = false,
  breadcrumbs
}: SEOHeadProps) => {
  const { t, i18n } = useTranslation();
  
  const title = customTitle || (titleKey ? t(titleKey) : "GoMonto - Location de Véhicules en Afrique de l'Ouest");
  const description = customDescription || (descriptionKey ? t(descriptionKey) : t("meta.homeDescription"));
  
  const currentLang = i18n.language;
  const baseUrl = "https://gomonto.com";
  const canonicalUrl = `${baseUrl}${currentLang !== 'fr' ? `/${currentLang}` : ''}${path}`;
  
  // Alternate language URLs for SEO
  const alternateUrls = [
    { lang: 'fr', url: `${baseUrl}${path}` },
    { lang: 'en', url: `${baseUrl}/en${path}` },
    { lang: 'pt', url: `${baseUrl}/pt${path}` }];

  // Default keywords for vehicle rental in West Africa
  const defaultKeywords = currentLang === "fr"
    ? "location voiture, location véhicule, Côte d'Ivoire, Abidjan, Sénégal, Dakar, Mali, Bamako, Burkina Faso, Ouagadougou, location 4x4, location SUV, location avec chauffeur, UEMOA, Afrique de l'Ouest, GoMonto"
    : currentLang === "pt"
    ? "aluguer carro, aluguer veículo, Costa do Marfim, Abidjan, Senegal, Dakar, Mali, Bamako, Burkina Faso, Ouagadougou, aluguer 4x4, aluguer SUV, aluguer com motorista, UEMOA, África Ocidental, GoMonto"
    : "car rental, vehicle rental, Ivory Coast, Abidjan, Senegal, Dakar, Mali, Bamako, Burkina Faso, Ouagadougou, 4x4 rental, SUV rental, rental with driver, UEMOA, West Africa, GoMonto";

  const finalKeywords = keywords || defaultKeywords;

  // Locale mapping for Open Graph
  const localeMap: Record<string, string> = {
    'fr': 'fr_FR',
    'en': 'en_GB',
    'pt': 'pt_PT'
  };

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <html lang={currentLang} />
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        <meta name="keywords" content={finalKeywords} />
        
        {/* Robots */}
        {noIndex ? (
          <meta name="robots" content="noindex, nofollow" />
        ) : (
          <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        )}
        
        {/* Author & Publisher */}
        <meta name="author" content="GoMonto" />
        <meta name="publisher" content="GoMonto" />
        <meta name="copyright" content="GoMonto" />
        
        {/* Canonical & Alternates */}
        <link rel="canonical" href={canonicalUrl} />
        {alternateUrls.map(({ lang, url }) => (
          <link key={lang} rel="alternate" hrefLang={lang} href={url} />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`${baseUrl}${path}`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content={type} />
        <meta property="og:site_name" content="GoMonto" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={`${baseUrl}${image}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={title} />
        <meta property="og:locale" content={localeMap[currentLang] || 'fr_FR'} />
        <meta property="og:locale:alternate" content="fr_FR" />
        <meta property="og:locale:alternate" content="en_GB" />
        <meta property="og:locale:alternate" content="pt_PT" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@gomonto" />
        <meta name="twitter:creator" content="@gomonto" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={`${baseUrl}${image}`} />
        <meta name="twitter:image:alt" content={title} />
        
        {/* Regional targeting for UEMOA */}
        <meta name="geo.region" content="CI" />
        <meta name="geo.placename" content="Abidjan" />
        <meta name="geo.position" content="5.3600;-4.0083" />
        <meta name="ICBM" content="5.3600, -4.0083" />
        
        {/* Mobile & App */}
        <meta name="format-detection" content="telephone=yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="GoMonto" />
        <meta name="application-name" content="GoMonto" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        
        {/* Verification (add your actual verification codes) */}
        {/* <meta name="google-site-verification" content="YOUR_GOOGLE_CODE" /> */}
        {/* <meta name="msvalidate.01" content="YOUR_BING_CODE" /> */}
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="//your-project.supabase.co" />
      </Helmet>
      
      {/* Structured Data */}
      <StructuredData type="organization" />
      <StructuredData type="localBusiness" />
      <StructuredData type="vehicleRental" />
      {breadcrumbs && <StructuredData type="breadcrumb" data={{ breadcrumbs }} />}
      <StructuredData type="webpage" data={{ path, title, description }} />
    </>
  );
};

export default SEOHead;
