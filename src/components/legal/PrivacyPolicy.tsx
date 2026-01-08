import { Shield, Database, Cookie, Lock, UserCheck, Globe } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="space-y-8">
      {/* Introduction */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Introduction
        </h2>
        <p>
          La présente Politique de Confidentialité décrit comment Inopay Group, éditeur 
          de la plateforme GoMonto, collecte, utilise, stocke et protège vos données 
          personnelles conformément aux réglementations en vigueur, notamment :
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
          <li>La loi n°2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel en Côte d'Ivoire</li>
          <li>Les dispositions de l'ARTCI (Autorité de Régulation des Télécommunications de Côte d'Ivoire)</li>
          <li>Le cadre juridique de protection des données de l'UEMOA</li>
          <li>Les principes du RGPD européen appliqués à titre de bonnes pratiques</li>
        </ul>
      </section>

      {/* Données collectées */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Données Collectées
        </h2>
        
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-xl p-6">
            <h3 className="font-semibold mb-3">Données d'Identification (KYC)</h3>
            <p className="text-muted-foreground mb-3">
              Dans le cadre de la vérification d'identité obligatoire pour les Loueurs :
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Nom, prénom, date de naissance</li>
              <li>Numéro de téléphone et adresse email</li>
              <li>Copie de la pièce d'identité (CNI, passeport)</li>
              <li>Permis de conduire pour les Locataires</li>
              <li>Justificatif de domicile</li>
            </ul>
          </div>
          
          <div className="bg-muted/30 rounded-xl p-6">
            <h3 className="font-semibold mb-3">Données de Localisation</h3>
            <p className="text-muted-foreground mb-3">
              Avec votre consentement explicite :
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Géolocalisation pour la recherche de véhicules à proximité</li>
              <li>Ville et pays de résidence</li>
              <li>Adresse de prise en charge et de restitution des véhicules</li>
            </ul>
          </div>
          
          <div className="bg-muted/30 rounded-xl p-6">
            <h3 className="font-semibold mb-3">Données de Transaction</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Historique des réservations</li>
              <li>Montants des transactions (sans les détails bancaires)</li>
              <li>Achats de crédits GoMonto</li>
              <li>Communications entre Loueurs et Locataires</li>
            </ul>
          </div>

          <div className="bg-muted/30 rounded-xl p-6">
            <h3 className="font-semibold mb-3">Données Techniques</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Adresse IP</li>
              <li>Type de navigateur et appareil</li>
              <li>Pages visitées et durée de navigation</li>
              <li>Identifiants de connexion (anonymisés)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Utilisation */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" />
          Utilisation des Données
        </h2>
        <p>Vos données sont utilisées pour :</p>
        <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
          <li>Créer et gérer votre compte utilisateur</li>
          <li>Vérifier votre identité (processus KYC)</li>
          <li>Faciliter la mise en relation entre Loueurs et Locataires</li>
          <li>Traiter les transactions et achats de crédits</li>
          <li>Améliorer nos services et l'expérience utilisateur</li>
          <li>Vous envoyer des communications relatives au service</li>
          <li>Prévenir la fraude et assurer la sécurité</li>
          <li>Respecter nos obligations légales</li>
        </ul>
      </section>

      {/* Cookies */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Cookie className="w-5 h-5 text-primary" />
          Cookies et Technologies Similaires
        </h2>
        
        <div className="space-y-4">
          <p>
            GoMonto utilise des cookies et technologies similaires pour améliorer 
            votre expérience. Ces technologies incluent :
          </p>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-border rounded-xl p-4">
              <h4 className="font-semibold text-primary mb-2">Cookies Essentiels</h4>
              <p className="text-sm text-muted-foreground">
                Nécessaires au fonctionnement de la plateforme (authentification, 
                sécurité, préférences de session).
              </p>
            </div>
            
            <div className="border border-border rounded-xl p-4">
              <h4 className="font-semibold text-primary mb-2">Cookies Analytiques</h4>
              <p className="text-sm text-muted-foreground">
                Nous aident à comprendre comment vous utilisez GoMonto pour 
                améliorer nos services.
              </p>
            </div>
            
            <div className="border border-border rounded-xl p-4">
              <h4 className="font-semibold text-primary mb-2">Cookies de Performance</h4>
              <p className="text-sm text-muted-foreground">
                Optimisent les temps de chargement et la fluidité de navigation.
              </p>
            </div>
            
            <div className="border border-border rounded-xl p-4">
              <h4 className="font-semibold text-primary mb-2">Cookies Marketing</h4>
              <p className="text-sm text-muted-foreground">
                Personnalisent les contenus et publicités (avec votre consentement).
              </p>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
            Vous pouvez gérer vos préférences de cookies à tout moment via les 
            paramètres de votre navigateur ou notre bannière de consentement.
          </p>
        </div>
      </section>

      {/* Sécurité */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          Sécurité des Données
        </h2>
        <div className="bg-primary/10 rounded-xl p-6">
          <p>
            Nous mettons en œuvre des mesures de sécurité techniques et 
            organisationnelles appropriées pour protéger vos données :
          </p>
          <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
            <li>Chiffrement SSL/TLS pour toutes les communications</li>
            <li>Stockage sécurisé des données sur des serveurs certifiés</li>
            <li>Contrôles d'accès stricts et authentification renforcée</li>
            <li>Audits de sécurité réguliers</li>
            <li>Formation du personnel à la protection des données</li>
          </ul>
        </div>
      </section>

      {/* Partage */}
      <section>
        <h2 className="text-xl font-bold mb-4">Partage des Données</h2>
        <p>Vos données peuvent être partagées avec :</p>
        <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
          <li><strong>Les autres Utilisateurs</strong> : uniquement les informations nécessaires à la transaction (nom, photo, évaluations)</li>
          <li><strong>Les prestataires techniques</strong> : hébergement, paiement, envoi d'emails (sous contrat de confidentialité)</li>
          <li><strong>Les autorités compétentes</strong> : sur demande légale ou judiciaire</li>
        </ul>
        <p className="mt-4 text-sm bg-muted/30 p-4 rounded-lg">
          <strong>Nous ne vendons jamais vos données personnelles à des tiers.</strong>
        </p>
      </section>

      {/* Droits */}
      <section>
        <h2 className="text-xl font-bold mb-4">Vos Droits</h2>
        <p>Conformément à la réglementation applicable, vous disposez des droits suivants :</p>
        <div className="grid gap-3 mt-4">
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <span className="font-semibold min-w-[120px]">Accès</span>
            <span className="text-muted-foreground">Obtenir une copie de vos données personnelles</span>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <span className="font-semibold min-w-[120px]">Rectification</span>
            <span className="text-muted-foreground">Corriger des données inexactes ou incomplètes</span>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <span className="font-semibold min-w-[120px]">Suppression</span>
            <span className="text-muted-foreground">Demander l'effacement de vos données</span>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <span className="font-semibold min-w-[120px]">Opposition</span>
            <span className="text-muted-foreground">Vous opposer à certains traitements</span>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <span className="font-semibold min-w-[120px]">Portabilité</span>
            <span className="text-muted-foreground">Recevoir vos données dans un format structuré</span>
          </div>
        </div>
        <p className="mt-4">
          Pour exercer ces droits, contactez-nous à : <a href="mailto:privacy@gomonto.com" className="text-primary hover:underline">privacy@gomonto.com</a>
        </p>
      </section>

      {/* Conservation */}
      <section>
        <h2 className="text-xl font-bold mb-4">Durée de Conservation</h2>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li><strong>Données de compte</strong> : conservées pendant la durée de votre inscription + 3 ans</li>
          <li><strong>Données de transaction</strong> : conservées 10 ans (obligations comptables)</li>
          <li><strong>Documents KYC</strong> : conservés 5 ans après la fin de la relation</li>
          <li><strong>Données de navigation</strong> : conservées 13 mois maximum</li>
        </ul>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Contact
        </h2>
        <div className="bg-muted/30 rounded-xl p-6">
          <p>
            Pour toute question concernant cette Politique de Confidentialité ou 
            vos données personnelles, contactez notre Délégué à la Protection des Données :
          </p>
          <div className="mt-4 space-y-2">
            <p><strong>Email</strong> : <a href="mailto:privacy@gomonto.com" className="text-primary hover:underline">privacy@gomonto.com</a></p>
            <p><strong>Adresse</strong> : 27 BP 148 Abidjan 27, Côte d'Ivoire</p>
            <p><strong>Téléphone</strong> : +225 07 01 23 89 74</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
