import request from 'supertest';
import express from 'express';
import { mobile_money_webhookRouter } from './mobile_money_webhook';

const app = express();
app.use(express.json());
app.use('/api/mobile-money-webhook', mobile_money_webhookRouter);

describe('mobile-money-webhook route', () => {

  describe('POST /api/mobile-money-webhook', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/mobile-money-webhook')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/mobile-money-webhook')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
