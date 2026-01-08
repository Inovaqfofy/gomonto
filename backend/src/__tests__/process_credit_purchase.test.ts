import request from 'supertest';
import express from 'express';
import { process_credit_purchaseRouter } from './process_credit_purchase';

const app = express();
app.use(express.json());
app.use('/api/process-credit-purchase', process_credit_purchaseRouter);

describe('process-credit-purchase route', () => {

  describe('POST /api/process-credit-purchase', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/process-credit-purchase')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/process-credit-purchase')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
