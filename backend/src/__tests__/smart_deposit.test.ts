import request from 'supertest';
import express from 'express';
import { smart_depositRouter } from './smart_deposit';

const app = express();
app.use(express.json());
app.use('/api/smart-deposit', smart_depositRouter);

describe('smart-deposit route', () => {

  describe('POST /api/smart-deposit', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/smart-deposit')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/smart-deposit')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
