export default function MentionsLegales() {
  return (
    <div className="max-w-4xl mx-auto p-8 text-slate-700 leading-relaxed">
      <h1 className="text-3xl font-bold mb-6">Mentions légales & Conditions d’utilisation</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Éditeur du site</h2>
        <p>
          Le site est développé et édité par la <strong>PMZ Corporation</strong>, représentée par{" "}
          <strong>Pol MAZOYER</strong> (ci-après « l’Éditeur »).
        </p>
        <p>
          Le site est destiné exclusivement au <strong>projet LAB de l’EFB</strong>. Toute utilisation en dehors
          de ce cadre est interdite sans autorisation écrite de l’Éditeur.
        </p>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">2. Objet – Absence de conseil</h2>
        <p>
          Les informations et fonctionnalités proposées sont fournies à titre <strong>strictement informatif</strong>.
          Elles ne constituent <strong>ni un conseil juridique, financier ou fiscal</strong>, ni une prestation
          de service au sens des articles 1112-1 et suivants du Code civil. L’utilisateur demeure seul responsable
          de ses décisions et de leur mise en œuvre.
        </p>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">3. Limitation de responsabilité</h2>
        <p>
          Dans les limites permises par la loi, la <strong>PMZ Corporation</strong> et <strong>Pol MAZOYER</strong>{" "}
          ne sauraient être tenus responsables de tout dommage direct ou indirect (y compris perte de chance,
          perte de profit, interruption d’activité, ou toute conséquence résultant d’une interprétation ou d’un
          usage des contenus/rapports générés par le site).
        </p>
        <p>
          Les contenus pouvant intégrer des traitements automatiques, aucune <strong>garantie d’exactitude,
          d’exhaustivité ou d’adéquation à un besoin particulier</strong> n’est fournie. L’utilisateur s’engage
          à effectuer ses propres vérifications et, le cas échéant, à consulter un professionnel compétent.
        </p>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">4. Propriété intellectuelle</h2>
        <p>
          L’ensemble du site (textes, contenus, maquettes, identité visuelle, logos, bases de données, et{" "}
          <em>code source</em>) est protégé par le Code de la propriété intellectuelle. Toute reproduction,
          représentation, extraction, adaptation, modification ou réutilisation, totale ou partielle, sans
          autorisation écrite préalable de l’Éditeur, est interdite et constitue une contrefaçon
          (<strong>art. L.122-4, L.335-2 et s. CPI</strong>).
        </p>
        <p>
          Le nom de domaine, la marque « LexBaux », ainsi que les signes distinctifs utilisés, sont protégés.
          Toute atteinte donnera lieu aux actions civiles et pénales appropriées.
        </p>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">5. Accès et disponibilité</h2>
        <p>
          L’accès au site est fourni « en l’état ». L’Éditeur pourra en modifier le contenu, en suspendre l’accès
          ou mettre fin au service, à tout moment, sans préavis ni indemnité. L’utilisateur reconnaît assumer les
          risques liés à l’usage d’une version de démonstration.
        </p>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">6. Données & confidentialité</h2>
        <p>
          Le site n’a pas vocation à collecter des données personnelles hors strict fonctionnement technique.
          Si vous importez des documents, vous garantissez disposer des droits nécessaires. L’Éditeur décline
          toute responsabilité en cas d’upload de contenus illicites ou confidentiels par l’utilisateur.
        </p>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">7. Liens sortants</h2>
        <p>
          Les liens vers des sites tiers sont fournis pour convenance. L’Éditeur n’exerce aucun contrôle sur
          leur contenu et décline toute responsabilité à leur égard.
        </p>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">8. Droit applicable – Juridiction</h2>
        <p>
          Les présentes sont régies par le <strong>droit français</strong>. Tout litige relatif à leur validité,
          leur interprétation ou leur exécution sera soumis aux juridictions françaises compétentes.
        </p>
      </section>

      <section className="space-y-1 mt-8 text-sm text-slate-500">
        <p>© {new Date().getFullYear()} PMZ Corporation — Tous droits réservés.</p>
        <p>
          Contact&nbsp;: <span className="select-all">[pol.mazoyer@hotmail.fr]</span>
        </p>
      </section>
    </div>
  );
}
