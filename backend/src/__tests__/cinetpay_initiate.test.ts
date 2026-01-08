import request from 'supertest';
import express from 'express';
import { cinetpay_initiateRouter } from './cinetpay_initiate';

const app = express();
app.use(express.json());
app.use('/api/cinetpay-initiate', cinetpay_initiateRouter);

describe('cinetpay-initiate route', () => {

  describe('POST /api/cinetpay-initiate', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/cinetpay-initiate')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/cinetpay-initiate')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
