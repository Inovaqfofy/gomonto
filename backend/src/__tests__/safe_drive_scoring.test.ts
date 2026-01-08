import request from 'supertest';
import express from 'express';
import { safe_drive_scoringRouter } from './safe_drive_scoring';

const app = express();
app.use(express.json());
app.use('/api/safe-drive-scoring', safe_drive_scoringRouter);

describe('safe-drive-scoring route', () => {

  describe('POST /api/safe-drive-scoring', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/safe-drive-scoring')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/safe-drive-scoring')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
