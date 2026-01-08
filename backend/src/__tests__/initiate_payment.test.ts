import request from 'supertest';
import express from 'express';
import { initiate_paymentRouter } from './initiate_payment';

const app = express();
app.use(express.json());
app.use('/api/initiate-payment', initiate_paymentRouter);

describe('initiate-payment route', () => {

  describe('POST /api/initiate-payment', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/initiate-payment')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/initiate-payment')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
