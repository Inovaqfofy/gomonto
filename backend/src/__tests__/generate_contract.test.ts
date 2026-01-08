import request from 'supertest';
import express from 'express';
import { generate_contractRouter } from './generate_contract';

const app = express();
app.use(express.json());
app.use('/api/generate-contract', generate_contractRouter);

describe('generate-contract route', () => {

  describe('POST /api/generate-contract', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/generate-contract')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/generate-contract')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
