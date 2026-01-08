import request from 'supertest';
import express from 'express';
import { payment_webhookRouter } from './payment_webhook';

const app = express();
app.use(express.json());
app.use('/api/payment-webhook', payment_webhookRouter);

describe('payment-webhook route', () => {

  describe('POST /api/payment-webhook', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/payment-webhook')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payment-webhook')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
