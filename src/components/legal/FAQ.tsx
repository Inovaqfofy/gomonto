import { Car, User, CreditCard, Shield, MessageCircle, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqCategories = [
  {
    id: "locataire",
    title: "Questions Locataires",
    icon: User,
    questions: [
      {
        q: "Comment sécuriser ma réservation ?",
        a: "Pour garantir votre réservation et bloquer les dates, nous vous recommandons de payer l'acompte demandé par le loueur via Mobile Money (MTN MoMo, Orange Money, Wave, Moov). Une fois le paiement confirmé, votre réservation passe en statut 'Garantie' et le véhicule vous est réservé. Sans acompte, le loueur peut attribuer le véhicule à un autre client."
      },
      {
        q: "Quels documents dois-je présenter lors de la prise du véhicule ?",
        a: "Vous devez présenter : votre pièce d'identité originale (CNI ou passeport), votre permis de conduire en cours de validité, et un justificatif de domicile récent. Le loueur vérifiera ces documents avant de vous remettre les clés."
      },
      {
        q: "Comment payer ma location ?",
        a: "Le paiement s'effectue directement au loueur via les moyens de paiement Mobile Money qu'il a configurés (MTN MoMo, Orange Money, Wave, Moov Money). Vous payez un acompte pour garantir la réservation, puis le solde à la remise des clés ou selon l'accord avec le loueur."
      },
      {
        q: "Que faire en cas de problème avec le véhicule ?",
        a: "Contactez immédiatement le loueur via la messagerie GoMonto pour signaler tout problème. En cas d'accident, suivez la procédure standard : constat amiable, photos, appel aux secours si nécessaire. GoMonto n'intervient pas dans les litiges mais peut faciliter la communication."
      },
      {
        q: "Puis-je annuler ma réservation ?",
        a: "Les conditions d'annulation dépendent de chaque loueur. Si vous avez payé un acompte, contactez le loueur directement pour négocier les modalités de remboursement. GoMonto recommande de clarifier ces conditions avant de confirmer votre réservation."
      },
      {
        q: "Comment contacter le loueur ?",
        a: "Une fois votre réservation confirmée (garantie par acompte ou acceptée par le loueur), vous avez accès à la messagerie interne pour communiquer directement avec le loueur. Son numéro de téléphone peut également être partagé pour les urgences."
      }
    ]
  },
  {
    id: "loueur",
    title: "Questions Loueurs",
    icon: Car,
    questions: [
      {
        q: "Comment acheter des crédits GoMonto ?",
        a: "Accédez à votre Wallet depuis le tableau de bord, puis cliquez sur 'Acheter des crédits'. Choisissez un pack (ex: 10 crédits = 5 000 FCFA) et payez via Mobile Money. Les crédits sont crédités instantanément sur votre compte après confirmation du paiement."
      },
      {
        q: "Combien coûte une mise en relation ?",
        a: "Chaque mise en relation confirmée (réservation garantie par acompte ou acceptée) vous coûte 1 crédit, soit environ 500 FCFA. Ce crédit est déduit automatiquement de votre Wallet lors de la confirmation de la réservation."
      },
      {
        q: "Comment configurer mes moyens de paiement ?",
        a: "Dans votre tableau de bord, accédez à 'Paramètres de Paiement'. Activez les méthodes que vous souhaitez proposer (MTN MoMo, Orange Money, Wave, Moov) et entrez vos identifiants marchands et clés API fournis par chaque opérateur."
      },
      {
        q: "Comment vérifier l'identité d'un locataire ?",
        a: "C'est votre responsabilité légale. Lors de la remise des clés : vérifiez la pièce d'identité originale, comparez la photo au visage du client, vérifiez la validité du permis de conduire, et prenez des photos de ces documents. Ne remettez jamais les clés sans cette vérification."
      },
      {
        q: "Comment ajouter un véhicule à ma flotte ?",
        a: "Depuis votre tableau de bord, cliquez sur 'Ajouter un véhicule'. Remplissez les informations (marque, modèle, année, prix), uploadez des photos de qualité, et définissez vos disponibilités. Votre véhicule sera visible après validation."
      },
      {
        q: "Que faire si un locataire ne paie pas le solde ?",
        a: "GoMonto ne peut pas intervenir dans les litiges commerciaux entre vous et le locataire. Nous vous recommandons de demander un acompte significatif (minimum 30-50%) et de clarifier les conditions de paiement avant la remise des clés. En cas de non-paiement, vous pouvez engager les voies légales habituelles."
      },
      {
        q: "Comment gérer mon calendrier de disponibilité ?",
        a: "Dans la section 'Calendrier' de votre tableau de bord, vous pouvez bloquer des dates pour chaque véhicule (maintenance, utilisation personnelle). Les dates avec réservations confirmées sont automatiquement bloquées."
      }
    ]
  },
  {
    id: "paiements",
    title: "Paiements & Crédits",
    icon: CreditCard,
    questions: [
      {
        q: "GoMonto gère-t-il les paiements de location ?",
        a: "Non. GoMonto est une plateforme de mise en relation uniquement. Les paiements de location (acompte et solde) s'effectuent directement entre le locataire et le loueur via les APIs Mobile Money configurées par le loueur. GoMonto ne détient, ne transfère ni ne contrôle ces fonds."
      },
      {
        q: "Comment fonctionne le système de crédits ?",
        a: "Les crédits sont la monnaie de mise en relation de GoMonto. Les loueurs achètent des packs de crédits. À chaque réservation confirmée, 1 crédit (environ 500 FCFA) est déduit du Wallet du loueur. C'est le seul revenu de GoMonto."
      },
      {
        q: "Les crédits sont-ils remboursables ?",
        a: "Non, les crédits achetés ne sont pas remboursables. Cependant, ils n'ont pas de date d'expiration et restent disponibles sur votre compte indéfiniment."
      },
      {
        q: "Quels moyens de paiement sont acceptés ?",
        a: "Pour l'achat de crédits GoMonto : MTN MoMo, Orange Money, Wave, Moov Money. Pour les paiements de location : les moyens configurés par chaque loueur sur son compte."
      },
      {
        q: "Quels sont les frais pour le Smart Deposit GoMonto ?",
        a: "Pour le Smart Deposit GoMonto, des frais de service de 5% s'appliquent sur le montant de la caution. Ces frais couvrent le paiement sécurisé via CinetPay et le remboursement automatique. IMPORTANT : Les frais de service ne sont pas remboursables, même en cas de restitution complète de la caution. Seul le montant de la caution (hors frais) vous sera restitué sous 48h. Exemple : Pour une caution de 50 000 FCFA, vous payez 52 500 FCFA (caution + 2 500 FCFA de frais). À la fin, vous recevez 50 000 FCFA."
      }
    ]
  },
  {
    id: "securite",
    title: "Sécurité & Confiance",
    icon: Shield,
    questions: [
      {
        q: "Comment GoMonto vérifie-t-il les loueurs ?",
        a: "Chaque loueur doit compléter un processus KYC (Know Your Customer) : vérification de l'identité, du justificatif de domicile, et des documents du véhicule. Les véhicules vérifiés affichent un badge 'Vérifié' sur leur profil."
      },
      {
        q: "Mes données personnelles sont-elles protégées ?",
        a: "Oui. GoMonto est conforme aux lois de protection des données en Côte d'Ivoire et dans l'UEMOA. Vos données sont chiffrées, stockées sur des serveurs sécurisés, et ne sont jamais vendues à des tiers. Consultez notre Politique de Confidentialité pour plus de détails."
      },
      {
        q: "Que faire en cas de fraude ou de profil suspect ?",
        a: "Signalez immédiatement le profil via le bouton 'Signaler' ou contactez-nous à support@gomonto.com. Notre équipe examine chaque signalement et peut suspendre ou supprimer les comptes frauduleux."
      },
      {
        q: "GoMonto est-il responsable en cas d'accident ?",
        a: "Non. GoMonto est une plateforme de mise en relation technique. Inopay Group décline toute responsabilité en cas d'accident, de vol, de dégradation ou de litige commercial. Le loueur et le locataire sont seuls parties au contrat de location."
      }
    ]
  },
  {
    id: "support",
    title: "Support & Contact",
    icon: MessageCircle,
    questions: [
      {
        q: "Comment contacter le support GoMonto ?",
        a: "Email : support@gomonto.com | Téléphone : +225 07 01 23 89 74 | Notre équipe est disponible du lundi au vendredi, de 8h à 18h (GMT). Pour les questions urgentes le week-end, envoyez un email et nous vous répondrons dès que possible."
      },
      {
        q: "Comment signaler un problème technique ?",
        a: "Envoyez un email à support@gomonto.com avec une description détaillée du problème, des captures d'écran si possible, et le nom de votre appareil/navigateur. Notre équipe technique vous répondra sous 24h."
      },
      {
        q: "Puis-je demander une fonctionnalité ?",
        a: "Absolument ! Nous adorons les retours de notre communauté. Envoyez vos suggestions à feedback@gomonto.com. Les meilleures idées sont régulièrement intégrées à notre feuille de route."
      }
    ]
  }
];

const FAQ = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <HelpCircle className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Foire Aux Questions</h2>
        </div>
        <p className="text-muted-foreground">
          Trouvez rapidement les réponses à vos questions. Si vous ne trouvez pas 
          ce que vous cherchez, n'hésitez pas à nous contacter.
        </p>
      </section>

      {/* FAQ Categories */}
      {faqCategories.map((category) => (
        <section key={category.id} className="bg-muted/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <category.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-bold">{category.title}</h3>
          </div>
          
          <Accordion type="single" collapsible className="space-y-2">
            {category.questions.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`${category.id}-${index}`}
                className="bg-background rounded-xl border-none"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 rounded-xl text-left">
                  <span className="font-medium text-sm md:text-base">{item.q}</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                    {item.a}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}

      {/* Contact CTA */}
      <section className="bg-primary/10 rounded-2xl p-6 text-center">
        <h3 className="text-lg font-bold mb-2">Vous n'avez pas trouvé votre réponse ?</h3>
        <p className="text-muted-foreground mb-4">
          Notre équipe support est là pour vous aider.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a 
            href="mailto:support@gomonto.com"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Contacter le support
          </a>
          <a 
            href="tel:+2250701238974"
            className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-xl font-medium hover:bg-muted transition-colors"
          >
            +225 07 01 23 89 74
          </a>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
