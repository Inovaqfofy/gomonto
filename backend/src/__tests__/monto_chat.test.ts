import request from 'supertest';
import express from 'express';
import { monto_chatRouter } from './monto_chat';

const app = express();
app.use(express.json());
app.use('/api/monto-chat', monto_chatRouter);

describe('monto-chat route', () => {

  describe('POST /api/monto-chat', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/monto-chat')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/monto-chat')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
