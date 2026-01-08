import request from 'supertest';
import express from 'express';
import { generate_condition_reportRouter } from './generate_condition_report';

const app = express();
app.use(express.json());
app.use('/api/generate-condition-report', generate_condition_reportRouter);

describe('generate-condition-report route', () => {

  describe('POST /api/generate-condition-report', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/generate-condition-report')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/generate-condition-report')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
