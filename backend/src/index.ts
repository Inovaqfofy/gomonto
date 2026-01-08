import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';

dotenv.config();

import { ai_damage_detectionRouter } from './routes/ai_damage_detection';
import { cinetpay_check_statusRouter } from './routes/cinetpay_check_status';
import { cinetpay_initiateRouter } from './routes/cinetpay_initiate';
import { cinetpay_webhookRouter } from './routes/cinetpay_webhook';
import { compliance_notificationsRouter } from './routes/compliance_notifications';
import { generate_condition_reportRouter } from './routes/generate_condition_report';
import { generate_contractRouter } from './routes/generate_contract';
import { ical_syncRouter } from './routes/ical_sync';
import { initiate_paymentRouter } from './routes/initiate_payment';
import { kyc_document_accessRouter } from './routes/kyc_document_access';
import { mobile_money_webhookRouter } from './routes/mobile_money_webhook';
import { monto_chatRouter } from './routes/monto_chat';
import { owner_apiRouter } from './routes/owner_api';
import { owner_direct_paymentRouter } from './routes/owner_direct_payment';
import { payment_webhookRouter } from './routes/payment_webhook';
import { process_credit_purchaseRouter } from './routes/process_credit_purchase';
import { safe_drive_scoringRouter } from './routes/safe_drive_scoring';
import { send_otpRouter } from './routes/send_otp';
import { smart_depositRouter } from './routes/smart_deposit';
import { verify_otpRouter } from './routes/verify_otp';

const app = express();
const PORT = process.env.PORT || 3000;

// Sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par fenêtre
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Routes API
app.use('/api/ai-damage-detection', ai_damage_detectionRouter);
app.use('/api/cinetpay-check-status', cinetpay_check_statusRouter);
app.use('/api/cinetpay-initiate', cinetpay_initiateRouter);
app.use('/api/cinetpay-webhook', cinetpay_webhookRouter);
app.use('/api/compliance-notifications', compliance_notificationsRouter);
app.use('/api/generate-condition-report', generate_condition_reportRouter);
app.use('/api/generate-contract', generate_contractRouter);
app.use('/api/ical-sync', ical_syncRouter);
app.use('/api/initiate-payment', initiate_paymentRouter);
app.use('/api/kyc-document-access', kyc_document_accessRouter);
app.use('/api/mobile-money-webhook', mobile_money_webhookRouter);
app.use('/api/monto-chat', monto_chatRouter);
app.use('/api/owner-api', owner_apiRouter);
app.use('/api/owner-direct-payment', owner_direct_paymentRouter);
app.use('/api/payment-webhook', payment_webhookRouter);
app.use('/api/process-credit-purchase', process_credit_purchaseRouter);
app.use('/api/safe-drive-scoring', safe_drive_scoringRouter);
app.use('/api/send-otp', send_otpRouter);
app.use('/api/smart-deposit', smart_depositRouter);
app.use('/api/verify-otp', verify_otpRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path,
    availableRoutes: ['/api/ai-damage-detection', '/api/cinetpay-check-status', '/api/cinetpay-initiate', '/api/cinetpay-webhook', '/api/compliance-notifications', '/api/generate-condition-report', '/api/generate-contract', '/api/ical-sync', '/api/initiate-payment', '/api/kyc-document-access', '/api/mobile-money-webhook', '/api/monto-chat', '/api/owner-api', '/api/owner-direct-payment', '/api/payment-webhook', '/api/process-credit-purchase', '/api/safe-drive-scoring', '/api/send-otp', '/api/smart-deposit', '/api/verify-otp']
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📂 Available routes:`);
  console.log(`   - /api/ai-damage-detection`);
  console.log(`   - /api/cinetpay-check-status`);
  console.log(`   - /api/cinetpay-initiate`);
  console.log(`   - /api/cinetpay-webhook`);
  console.log(`   - /api/compliance-notifications`);
  console.log(`   - /api/generate-condition-report`);
  console.log(`   - /api/generate-contract`);
  console.log(`   - /api/ical-sync`);
  console.log(`   - /api/initiate-payment`);
  console.log(`   - /api/kyc-document-access`);
  console.log(`   - /api/mobile-money-webhook`);
  console.log(`   - /api/monto-chat`);
  console.log(`   - /api/owner-api`);
  console.log(`   - /api/owner-direct-payment`);
  console.log(`   - /api/payment-webhook`);
  console.log(`   - /api/process-credit-purchase`);
  console.log(`   - /api/safe-drive-scoring`);
  console.log(`   - /api/send-otp`);
  console.log(`   - /api/smart-deposit`);
  console.log(`   - /api/verify-otp`);
});

export default app;
