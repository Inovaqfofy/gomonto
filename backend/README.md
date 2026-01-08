# 🔌 Backend API (Converti depuis Edge Functions)

## 📊 Statistiques de conversion

| Métrique | Valeur |
|----------|--------|
| Edge Functions converties | 20 |
| Routes générées | 20 |
| Taux de préservation moyen | 100% |

## 🚀 Démarrage rapide

```bash
cd backend
npm install
npm run dev
```

## 📂 Routes API

- `/api/ai-damage-detection`
- `/api/cinetpay-check-status`
- `/api/cinetpay-initiate`
- `/api/cinetpay-webhook`
- `/api/compliance-notifications`
- `/api/generate-condition-report`
- `/api/generate-contract`
- `/api/ical-sync`
- `/api/initiate-payment`
- `/api/kyc-document-access`
- `/api/mobile-money-webhook`
- `/api/monto-chat`
- `/api/owner-api`
- `/api/owner-direct-payment`
- `/api/payment-webhook`
- `/api/process-credit-purchase`
- `/api/safe-drive-scoring`
- `/api/send-otp`
- `/api/smart-deposit`
- `/api/verify-otp`

## 🔧 Structure

```
backend/
├── src/
│   ├── index.ts           # Point d'entrée Express
│   ├── routes/            # Routes converties
│   ├── middleware/        # Auth et autres middlewares
│   └── __tests__/         # Tests unitaires
├── _original-edge-functions/  # Code Deno original (référence)
├── package.json
├── tsconfig.json
└── Dockerfile
```

## ⚠️ Points à vérifier

1. **Environnement**: Copiez `.env.example` vers `.env` et remplissez les valeurs
2. **Base de données**: Vérifiez que `DATABASE_URL` pointe vers votre PostgreSQL
3. **Secrets**: Assurez-vous que tous les secrets sont configurés

## 📝 TODOs manuels

Certaines conversions peuvent nécessiter des ajustements manuels. 
Recherchez `// TODO` dans les fichiers de routes.

---
*Généré automatiquement par InoPay Liberation Pack*
