import { Building2, MapPin, Phone, Mail, User, Server } from "lucide-react";

const LegalMentions = () => {
  return (
    <div className="space-y-8">
      {}
      <section>
        <h2 className="text-xl font-bold mb-4">Propriété Intellectuelle</h2>
        <div className="space-y-4">
          <p>
            L'ensemble des éléments constituant la plateforme GoMonto (textes, graphismes, 
            logiciels, photographies, images, vidéos, sons, plans, logos, marques, créations 
            et œuvres protégeables diverses, bases de données, etc.) ainsi que le site lui-même 
            sont la propriété exclusive d'Inopay Group ou de ses partenaires.
          </p>
          <p>
            Ces éléments sont protégés par les lois relatives à la propriété intellectuelle 
            et notamment le droit d'auteur. Toute reproduction, représentation, utilisation, 
            adaptation, modification, incorporation, traduction, commercialisation, partielle 
            ou intégrale, par quelque procédé et sur quelque support que ce soit est interdite, 
            sans l'autorisation écrite préalable d'Inopay Group, à l'exception de l'utilisation 
            pour un usage privé sous réserve des dispositions différentes voire plus restrictives 
            du Code de la propriété intellectuelle.
          </p>
        </div>
      </section>

      {/* Crédits */}
      <section>
        <h2 className="text-xl font-bold mb-4">Crédits</h2>
        <div className="space-y-3">
          <p><strong>Conception et développement :</strong> Inopay Group</p>
          <p><strong>Design :</strong> Équipe créative GoMonto</p>
          <p><strong>Photographies :</strong> Crédits aux photographes respectifs (Unsplash, Pexels)</p>
        </div>
      </section>
    </div>
  );
};

export default LegalMentions;
