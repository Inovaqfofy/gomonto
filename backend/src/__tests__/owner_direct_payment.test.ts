import request from 'supertest';
import express from 'express';
import { owner_direct_paymentRouter } from './owner_direct_payment';

const app = express();
app.use(express.json());
app.use('/api/owner-direct-payment', owner_direct_paymentRouter);

describe('owner-direct-payment route', () => {

  describe('POST /api/owner-direct-payment', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/owner-direct-payment')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/owner-direct-payment')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
