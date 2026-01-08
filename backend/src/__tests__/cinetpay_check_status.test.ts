import request from 'supertest';
import express from 'express';
import { cinetpay_check_statusRouter } from './cinetpay_check_status';

const app = express();
app.use(express.json());
app.use('/api/cinetpay-check-status', cinetpay_check_statusRouter);

describe('cinetpay-check-status route', () => {

  describe('POST /api/cinetpay-check-status', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/cinetpay-check-status')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/cinetpay-check-status')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
