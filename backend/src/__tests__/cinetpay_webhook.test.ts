import request from 'supertest';
import express from 'express';
import { cinetpay_webhookRouter } from './cinetpay_webhook';

const app = express();
app.use(express.json());
app.use('/api/cinetpay-webhook', cinetpay_webhookRouter);

describe('cinetpay-webhook route', () => {

  describe('POST /api/cinetpay-webhook', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/cinetpay-webhook')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/cinetpay-webhook')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
