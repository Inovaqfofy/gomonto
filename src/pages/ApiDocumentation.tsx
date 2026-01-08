import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Code, 
  Key, 
  Car, 
  Calendar, 
  BarChart3, 
  AlertCircle,
  Copy,
  CheckCircle,
  ExternalLink,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";

const ApiDocumentation = () => {
  const { t } = useTranslation();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success("Code copié !");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
    <div className="relative">
      <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-t-lg border border-b-0">
        <span className="text-sm text-muted-foreground">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(code, id)}
          className="h-8"
        >
          {copiedCode === id ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
      <pre className="bg-muted p-4 rounded-b-lg overflow-x-auto border">
        <code className="text-sm">{code}</code>
      </pre>
    </div>
  );

  const endpoints = [
    {
      method: "GET",
      path: "/v1/vehicles",
      description: "Récupère la liste de tous vos véhicules actifs",
      response: `{
  "vehicles": [
    {
      "id": "uuid",
      "brand": "Toyota",
      "model": "Land Cruiser",
      "year": 2023,
      "daily_price": 75000,
      "location_city": "Dakar",
      "location_country": "senegal",
      "fuel_type": "diesel",
      "transmission": "automatic",
      "seats": 7,
      "description": "SUV confortable",
      "features": ["GPS", "Climatisation"],
      "self_drive_allowed": true,
      "status": "active",
      "vehicle_photos": [...]
    }
  ],
  "count": 1
}`
    },
    {
      method: "GET",
      path: "/v1/vehicles/:id",
      description: "Récupère les détails d'un véhicule spécifique",
      response: `{
  "vehicle": {
    "id": "uuid",
    "brand": "Toyota",
    "model": "Land Cruiser",
    "year": 2023,
    "daily_price": 75000,
    "weekly_price": 450000,
    "monthly_price": 1800000,
    "location_city": "Dakar",
    "location_country": "senegal",
    "fuel_type": "diesel",
    "transmission": "automatic",
    "seats": 7,
    "description": "SUV confortable",
    "features": ["GPS", "Climatisation"],
    "self_drive_allowed": true,
    "status": "active",
    "deposit_amount": 100000,
    "vehicle_photos": [...]
  }
}`
    },
    {
      method: "GET",
      path: "/v1/availability/:id",
      description: "Vérifie la disponibilité d'un véhicule sur une période",
      params: "?start_date=2024-01-15&end_date=2024-04-15",
      response: `{
  "vehicle_id": "uuid",
  "period": {
    "start": "2024-01-15",
    "end": "2024-04-15"
  },
  "blocked_dates": [
    {
      "start": "2024-02-01",
      "end": "2024-02-05",
      "reason": "reservation"
    }
  ],
  "external_syncs": 0
}`
    },
    {
      method: "POST",
      path: "/v1/reservations",
      description: "Crée une nouvelle réservation",
      body: `{
  "vehicle_id": "uuid",
  "start_date": "2024-01-15",
  "end_date": "2024-01-20",
  "renter_name": "Jean Dupont",
  "renter_phone": "+221771234567",
  "renter_email": "jean@example.com",
  "with_driver": false,
  "notes": "Arrivée prévue à 10h"
}`,
      response: `{
  "reservation": {
    "id": "uuid",
    "vehicle_id": "uuid",
    "start_date": "2024-01-15",
    "end_date": "2024-01-20",
    "total_price": 375000,
    "status": "pending"
  },
  "message": "Réservation créée avec succès"
}`
    },
    {
      method: "GET",
      path: "/v1/stats",
      description: "Récupère les statistiques de votre flotte",
      response: `{
  "stats": {
    "total_vehicles": 10,
    "total_reservations": 45,
    "completed_reservations": 38,
    "pending_reservations": 7,
    "total_revenue": 2500000
  }
}`
    }
  ];

  const errorCodes = [
    { code: 200, status: "OK", description: "Requête réussie" },
    { code: 201, status: "Created", description: "Ressource créée avec succès" },
    { code: 400, status: "Bad Request", description: "Paramètres invalides ou manquants" },
    { code: 401, status: "Unauthorized", description: "Clé API invalide ou manquante" },
    { code: 403, status: "Forbidden", description: "Accès refusé (origine non autorisée, clé désactivée)" },
    { code: 404, status: "Not Found", description: "Ressource non trouvée" },
    { code: 409, status: "Conflict", description: "Conflit (ex: véhicule déjà réservé)" },
    { code: 429, status: "Too Many Requests", description: "Limite de requêtes dépassée" },
    { code: 500, status: "Internal Server Error", description: "Erreur serveur interne" }
  ];

  return (
    <>
      <Helmet>
        <title>Documentation API - GoMonto</title>
        <meta name="description" content="Documentation complète de l'API GoMonto pour intégrer la gestion de flotte à votre système" />
      </Helmet>

      <Navbar />

      <main className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Documentation API GoMonto</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Intégrez la gestion de votre flotte GoMonto à votre site web ou application.
            </p>
          </div>

          <Tabs defaultValue="introduction" className="space-y-6">
            <TabsList className="flex-wrap h-auto gap-2">
              <TabsTrigger value="introduction">Introduction</TabsTrigger>
              <TabsTrigger value="authentication">Authentification</TabsTrigger>
              <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
              <TabsTrigger value="errors">Erreurs</TabsTrigger>
              <TabsTrigger value="examples">Exemples</TabsTrigger>
              <TabsTrigger value="widget">Widget</TabsTrigger>
            </TabsList>

            {/* Introduction */}
            <TabsContent value="introduction">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Introduction
                  </CardTitle>
                  <CardDescription>
                    Bienvenue dans la documentation de l'API GoMonto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Qu'est-ce que l'API GoMonto ?</h3>
                    <p className="text-muted-foreground">
                      L'API GoMonto vous permet d'intégrer la gestion de votre flotte de véhicules 
                      directement dans votre site web ou application. Vous pouvez afficher vos véhicules, 
                      vérifier les disponibilités et accepter des réservations via votre propre interface.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">URL de base</h3>
                    <CodeBlock 
                      code="https://your-project.supabase.co/functions/v1/owner-api"
                      language="URL"
                      id="base-url"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Format des réponses</h3>
                    <p className="text-muted-foreground mb-2">
                      Toutes les réponses sont au format JSON. Chaque endpoint retourne ses données directement :
                    </p>
                    <CodeBlock 
                      code={`// Exemple réponse véhicules
{
  "vehicles": [...],
  "count": 5
}

// En cas d'erreur
{
  "error": "Message d'erreur"
}`}
                      language="JSON"
                      id="response-format"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Limites de requêtes</h3>
                    <p className="text-muted-foreground">
                      Par défaut, vous pouvez effectuer jusqu'à 1000 requêtes par heure. 
                      Cette limite peut être personnalisée lors de la création de votre clé API.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Authentication */}
            <TabsContent value="authentication">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Authentification
                  </CardTitle>
                  <CardDescription>
                    Comment authentifier vos requêtes API
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Clé API</h3>
                    <p className="text-muted-foreground mb-4">
                      Toutes les requêtes à l'API doivent inclure votre clé API dans l'en-tête 
                      <code className="bg-muted px-1 rounded mx-1">X-API-Key</code>.
                    </p>
                    <CodeBlock 
                      code={`curl -X GET "https://your-project.supabase.co/functions/v1/owner-api/v1/vehicles" \\
  -H "X-API-Key: votre_cle_api"`}
                      language="cURL"
                      id="auth-curl"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Obtenir une clé API</h3>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>Connectez-vous à votre tableau de bord GoMonto</li>
                      <li>Accédez à la section "API & Intégrations"</li>
                      <li>Cliquez sur "Nouvelle clé API"</li>
                      <li>Configurez les permissions et les origines autorisées</li>
                      <li>Copiez et conservez votre clé en lieu sûr</li>
                    </ol>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-500">Important</h4>
                        <p className="text-sm text-muted-foreground">
                          Ne partagez jamais votre clé API publiquement. Si vous pensez que votre clé 
                          a été compromise, désactivez-la immédiatement depuis votre tableau de bord 
                          et créez-en une nouvelle.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Origines autorisées (CORS)</h3>
                    <p className="text-muted-foreground">
                      Pour les appels depuis un navigateur, vous devez configurer les origines autorisées 
                      lors de la création de votre clé API. Seuls les domaines listés pourront utiliser 
                      votre clé API.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Endpoints */}
            <TabsContent value="endpoints">
              <div className="space-y-6">
                {endpoints.map((endpoint, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Badge 
                          variant={endpoint.method === "GET" ? "secondary" : "default"}
                          className={endpoint.method === "POST" ? "bg-green-500" : ""}
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="font-mono">{endpoint.path}</code>
                      </CardTitle>
                      <CardDescription>{endpoint.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {endpoint.params && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Paramètres de requête</h4>
                          <code className="bg-muted px-2 py-1 rounded text-sm">{endpoint.params}</code>
                        </div>
                      )}
                      
                      {endpoint.body && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Corps de la requête</h4>
                          <CodeBlock code={endpoint.body} language="JSON" id={`body-${index}`} />
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold text-sm mb-2">Réponse</h4>
                        <CodeBlock code={endpoint.response} language="JSON" id={`response-${index}`} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Errors */}
            <TabsContent value="errors">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Codes d'erreur
                  </CardTitle>
                  <CardDescription>
                    Liste des codes de statut HTTP utilisés par l'API
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Code</th>
                          <th className="text-left py-3 px-4">Statut</th>
                          <th className="text-left py-3 px-4">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {errorCodes.map((error) => (
                          <tr key={error.code} className="border-b">
                            <td className="py-3 px-4">
                              <Badge variant={error.code < 400 ? "secondary" : "destructive"}>
                                {error.code}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 font-mono text-sm">{error.status}</td>
                            <td className="py-3 px-4 text-muted-foreground">{error.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">Format des erreurs</h3>
                    <CodeBlock 
                      code={`{
  "error": "Description de l'erreur"
}`}
                      language="JSON"
                      id="error-format"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Examples */}
            <TabsContent value="examples">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      Exemples JavaScript
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Récupérer la liste des véhicules</h3>
                      <CodeBlock 
                        code={`const API_KEY = 'votre_cle_api';
const BASE_URL = 'https://your-project.supabase.co/functions/v1/owner-api';

async function getVehicles() {
  const response = await fetch(\`\${BASE_URL}/v1/vehicles\`, {
    headers: {
      'X-API-Key': API_KEY
    }
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error);
  }
  
  return data.vehicles;
}

// Utilisation
getVehicles()
  .then(vehicles => console.log(\`\${vehicles.length} véhicules trouvés\`))
  .catch(error => console.error(error));`}
                        language="JavaScript"
                        id="js-get-vehicles"
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Vérifier la disponibilité</h3>
                      <CodeBlock 
                        code={`async function checkAvailability(vehicleId, startDate, endDate) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate
  });
  
  const response = await fetch(
    \`\${BASE_URL}/v1/availability/\${vehicleId}?\${params}\`,
    {
      headers: {
        'X-API-Key': API_KEY
      }
    }
  );
  
  return await response.json();
}

// Utilisation
checkAvailability('vehicle-uuid', '2024-01-15', '2024-04-15')
  .then(result => {
    if (result.blocked_dates.length === 0) {
      console.log('Véhicule disponible sur toute la période !');
    } else {
      console.log(\`\${result.blocked_dates.length} période(s) bloquée(s)\`);
    }
  });`}
                        language="JavaScript"
                        id="js-availability"
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Créer une réservation</h3>
                      <CodeBlock 
                        code={`async function createReservation(reservationData) {
  const response = await fetch(\`\${BASE_URL}/v1/reservations\`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reservationData)
  });
  
  return await response.json();
}

// Utilisation
createReservation({
  vehicle_id: 'vehicle-uuid',
  start_date: '2024-01-15',
  end_date: '2024-01-20',
  renter_name: 'Jean Dupont',
  renter_phone: '+221771234567',
  renter_email: 'jean@example.com'
}).then(result => {
  if (result.success) {
    console.log(\`Réservation créée: \${result.data.reservation_number}\`);
  }
});`}
                        language="JavaScript"
                        id="js-reservation"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Exemples cURL</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Liste des véhicules</h3>
                      <CodeBlock 
                        code={`curl -X GET "https://your-project.supabase.co/functions/v1/owner-api/v1/vehicles" \\
  -H "X-API-Key: votre_cle_api"`}
                        language="cURL"
                        id="curl-vehicles"
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Créer une réservation</h3>
                      <CodeBlock 
                        code={`curl -X POST "https://your-project.supabase.co/functions/v1/owner-api/v1/reservations" \\
  -H "X-API-Key: votre_cle_api" \\
  -H "Content-Type: application/json" \\
  -d '{
    "vehicle_id": "vehicle-uuid",
    "start_date": "2024-01-15",
    "end_date": "2024-01-20",
    "renter_name": "Jean Dupont",
    "renter_phone": "+221771234567"
  }'`}
                        language="cURL"
                        id="curl-reservation"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Widget */}
            <TabsContent value="widget">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Widget d'intégration
                  </CardTitle>
                  <CardDescription>
                    Intégrez facilement vos véhicules sur votre site web
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Intégration simple</h3>
                    <p className="text-muted-foreground mb-4">
                      Copiez ce code et collez-le dans votre page HTML pour afficher vos véhicules :
                    </p>
                    <CodeBlock 
                      code={`<!-- Widget GoMonto -->
<div id="gomonto-widget"></div>
<script>
  (function() {
    const API_KEY = 'votre_cle_api';
    const container = document.getElementById('gomonto-widget');
    
    // Fonction d'échappement HTML pour prévenir les attaques XSS
    function escapeHTML(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
    
    fetch('https://your-project.supabase.co/functions/v1/owner-api/v1/vehicles', {
      headers: { 'X-API-Key': API_KEY }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Méthode sécurisée avec createElement et textContent
        data.data.forEach(vehicle => {
          const card = document.createElement('div');
          card.className = 'vehicle-card';
          
          const title = document.createElement('h3');
          title.textContent = vehicle.brand + ' ' + vehicle.model;
          
          const price = document.createElement('p');
          price.textContent = vehicle.price_per_day + ' FCFA/jour';
          
          const location = document.createElement('p');
          location.textContent = vehicle.location;
          
          card.appendChild(title);
          card.appendChild(price);
          card.appendChild(location);
          container.appendChild(card);
        });
      }
    });
  })();
</script>

<style>
  .vehicle-card {
    border: 1px solid #ddd;
    padding: 16px;
    margin: 8px;
    border-radius: 8px;
  }
</style>`}
                      language="HTML"
                      id="widget-basic"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Widget React</h3>
                    <CodeBlock 
                      code={`import { useState, useEffect } from 'react';

const API_KEY = 'votre_cle_api';
const BASE_URL = 'https://your-project.supabase.co/functions/v1/owner-api';

function GoMontoVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(\`\${BASE_URL}/v1/vehicles\`, {
      headers: { 'X-API-Key': API_KEY }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setVehicles(data.data);
        }
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {vehicles.map(vehicle => (
        <div key={vehicle.id} className="border p-4 rounded-lg">
          <h3>{vehicle.brand} {vehicle.model}</h3>
          <p>{vehicle.price_per_day} FCFA/jour</p>
          <p>{vehicle.location}</p>
        </div>
      ))}
    </div>
  );
}

export default GoMontoVehicles;`}
                      language="React"
                      id="widget-react"
                    />
                  </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Besoin d'aide ?</h4>
                    <p className="text-sm text-muted-foreground">
                      Si vous avez besoin d'aide pour intégrer l'API GoMonto, 
                      contactez notre équipe technique à support@gomonto.com
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default ApiDocumentation;
