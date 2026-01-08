import request from 'supertest';
import express from 'express';
import { compliance_notificationsRouter } from './compliance_notifications';

const app = express();
app.use(express.json());
app.use('/api/compliance-notifications', compliance_notificationsRouter);

describe('compliance-notifications route', () => {

  describe('POST /api/compliance-notifications', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/compliance-notifications')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/compliance-notifications')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
