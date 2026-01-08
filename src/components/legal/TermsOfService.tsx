const TermsOfService = () => {
  return (
    <div className="space-y-8">
      {/* Préambule */}
      <section>
        <h2 className="text-xl font-bold mb-4">Préambule</h2>
        <p>
          Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent 
          l'accès et l'utilisation de la plateforme GoMonto, éditée par Inopay Group, 
          SARL de droit ivoirien immatriculée sous le numéro RCCM CI-ABJ-03-2023-B13-03481.
        </p>
        <p className="mt-3">
          En accédant à la plateforme ou en créant un compte, l'Utilisateur accepte 
          sans réserve les présentes CGU.
        </p>
      </section>

      {/* Définitions */}
      <section>
        <h2 className="text-xl font-bold mb-4">Article 1 - Définitions</h2>
        <div className="bg-muted/30 rounded-xl p-6 space-y-3">
          <p><strong>« Plateforme »</strong> : désigne le site web et l'application mobile GoMonto.</p>
          <p><strong>« Loueur »</strong> : désigne toute personne physique ou morale proposant un véhicule à la location via la Plateforme.</p>
          <p><strong>« Locataire »</strong> : désigne toute personne souhaitant louer un véhicule via la Plateforme.</p>
          <p><strong>« Utilisateur »</strong> : désigne tout Loueur ou Locataire inscrit sur la Plateforme.</p>
          <p><strong>« Crédits »</strong> : désigne les unités de mise en relation achetées par les Loueurs pour accéder aux demandes de réservation.</p>
          <p><strong>« Contrat de Location »</strong> : désigne l'accord conclu directement entre le Loueur et le Locataire.</p>
        </div>
      </section>

      {/* Rôle de GoMonto */}
      <section>
        <h2 className="text-xl font-bold mb-4">Article 2 - Rôle de GoMonto</h2>
        <div className="border-l-4 border-primary pl-4 py-2 bg-primary/5 rounded-r-lg">
          <p className="font-medium text-primary mb-2">Important</p>
          <p>
            GoMonto est une <strong>plateforme de mise en relation technique (SaaS)</strong> entre 
            des propriétaires de véhicules (Loueurs) et des personnes souhaitant louer ces véhicules 
            (Locataires).
          </p>
        </div>
        <div className="mt-4 space-y-3">
          <p>
            <strong>Inopay Group n'est ni propriétaire des véhicules listés sur la Plateforme, 
            ni partie au contrat de location final conclu entre le Loueur et le Locataire.</strong>
          </p>
          <p>
            GoMonto fournit uniquement une infrastructure technologique permettant la mise 
            en relation et ne saurait être considéré comme un loueur de véhicules, un 
            intermédiaire commercial ou un mandataire.
          </p>
        </div>
      </section>

      {/* Inscription */}
      <section>
        <h2 className="text-xl font-bold mb-4">Article 3 - Inscription et Compte Utilisateur</h2>
        <div className="space-y-3">
          <p>L'inscription sur la Plateforme est gratuite et nécessite :</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>D'être majeur et capable juridiquement</li>
            <li>De fournir des informations exactes et complètes</li>
            <li>De procéder à la vérification d'identité (KYC) pour les Loueurs</li>
            <li>D'accepter les présentes CGU</li>
          </ul>
          <p className="mt-4">
            L'Utilisateur est responsable de la confidentialité de ses identifiants de connexion 
            et de toutes les activités effectuées sous son compte.
          </p>
        </div>
      </section>

      {/* Paiements */}
      <section>
        <h2 className="text-xl font-bold mb-4">Article 4 - Paiements et Transactions</h2>
        <div className="space-y-4">
          <div className="bg-secondary/10 rounded-xl p-6">
            <h3 className="font-semibold mb-3">4.1 Paiements de Location</h3>
            <p>
              Les paiements relatifs aux locations de véhicules (acompte, solde) s'effectuent 
              <strong> directement entre le Locataire et le Loueur</strong> via les moyens de 
              paiement Mobile Money (MTN MoMo, Orange Money, Moov Money, Wave) configurés par 
              le Loueur sur son compte.
            </p>
            <p className="mt-3 text-muted-foreground">
              GoMonto ne perçoit, ne conserve ni ne transfère les fonds relatifs aux locations. 
              Ces transactions sont effectuées directement via les APIs des opérateurs Mobile 
              Money configurées par le Loueur.
            </p>
          </div>
          
          <div className="bg-primary/10 rounded-xl p-6">
            <h3 className="font-semibold mb-3">4.2 Crédits de Mise en Relation</h3>
            <p>
              GoMonto commercialise des « Crédits » permettant aux Loueurs de recevoir les 
              demandes de réservation. Ces crédits sont facturés à Inopay Group et constituent 
              la seule source de revenus de la Plateforme.
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
              <li>Les crédits sont déductibles à chaque mise en relation confirmée</li>
              <li>Les crédits achetés ne sont pas remboursables</li>
              <li>Les crédits n'ont pas de date d'expiration</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Responsabilité */}
      <section>
        <h2 className="text-xl font-bold mb-4">Article 5 - Limitation de Responsabilité</h2>
        <div className="border border-destructive/30 rounded-xl p-6 bg-destructive/5">
          <p className="font-medium text-destructive mb-3">Clause de non-responsabilité</p>
          <p>
            <strong>Inopay Group décline toute responsabilité en cas de :</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
            <li>Litige commercial entre le Loueur et le Locataire</li>
            <li>Accident survenu pendant la période de location</li>
            <li>Vol du véhicule ou de ses accessoires</li>
            <li>Dégradation du véhicule par le Locataire</li>
            <li>Non-paiement du solde de location par le Locataire</li>
            <li>Défaut d'assurance ou de documents du véhicule</li>
            <li>Tout dommage corporel, matériel ou immatériel résultant de la location</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Le Loueur et le Locataire sont seuls responsables de l'exécution du contrat 
            de location qu'ils concluent entre eux.
          </p>
        </div>
      </section>

      {/* Vérification */}
      <section>
        <h2 className="text-xl font-bold mb-4">Article 6 - Obligations du Loueur</h2>
        <div className="space-y-4">
          <div className="bg-secondary/10 rounded-xl p-6">
            <h3 className="font-semibold mb-3">6.1 Vérification d'Identité</h3>
            <p>
              <strong>Le Loueur a l'obligation formelle de vérifier :</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
              <li>L'identité physique du Locataire avant la remise des clés</li>
              <li>La validité et l'authenticité du permis de conduire</li>
              <li>La correspondance entre le Locataire inscrit et la personne présente</li>
            </ul>
            <p className="mt-4 text-sm bg-background/50 p-3 rounded-lg">
              ⚠️ En cas de non-vérification, le Loueur assume l'entière responsabilité 
              des conséquences pouvant en découler.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">6.2 Véhicule</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Le véhicule doit être en état de marche et conforme à la description</li>
              <li>Le véhicule doit disposer d'une assurance valide couvrant la location</li>
              <li>Les documents du véhicule (carte grise, assurance, contrôle technique) doivent être à jour</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Obligations Locataire */}
      <section>
        <h2 className="text-xl font-bold mb-4">Article 7 - Obligations du Locataire</h2>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Utiliser le véhicule conformément à sa destination normale</li>
          <li>Respecter le Code de la route applicable</li>
          <li>Restituer le véhicule dans l'état où il l'a reçu</li>
          <li>Signaler immédiatement tout incident ou accident au Loueur</li>
          <li>Ne pas sous-louer le véhicule à un tiers</li>
        </ul>
      </section>

      {/* Résiliation */}
      <section>
        <h2 className="text-xl font-bold mb-4">Article 8 - Suspension et Résiliation</h2>
        <p>
          GoMonto se réserve le droit de suspendre ou résilier sans préavis tout compte 
          Utilisateur en cas de :
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
          <li>Non-respect des présentes CGU</li>
          <li>Fourniture d'informations fausses ou trompeuses</li>
          <li>Activité frauduleuse ou illégale</li>
          <li>Atteinte à la réputation de la Plateforme</li>
        </ul>
      </section>

      {/* Droit applicable */}
      <section>
        <h2 className="text-xl font-bold mb-4">Article 9 - Droit Applicable et Juridiction</h2>
        <p>
          Les présentes CGU sont soumises au droit ivoirien. Tout litige relatif à leur 
          interprétation ou leur exécution sera soumis à la compétence exclusive des 
          tribunaux d'Abidjan, Côte d'Ivoire.
        </p>
      </section>

      {/* Modification */}
      <section>
        <h2 className="text-xl font-bold mb-4">Article 10 - Modification des CGU</h2>
        <p>
          Inopay Group se réserve le droit de modifier les présentes CGU à tout moment. 
          Les Utilisateurs seront informés de toute modification substantielle par email 
          ou notification sur la Plateforme. L'utilisation continue de la Plateforme 
          après notification vaut acceptation des nouvelles conditions.
        </p>
      </section>
    </div>
  );
};

export default TermsOfService;
