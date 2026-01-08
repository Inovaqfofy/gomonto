import request from 'supertest';
import express from 'express';
import { ai_damage_detectionRouter } from './ai_damage_detection';

const app = express();
app.use(express.json());
app.use('/api/ai-damage-detection', ai_damage_detectionRouter);

describe('ai-damage-detection route', () => {

  describe('POST /api/ai-damage-detection', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/ai-damage-detection')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai-damage-detection')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
