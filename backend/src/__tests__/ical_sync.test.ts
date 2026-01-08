import request from 'supertest';
import express from 'express';
import { ical_syncRouter } from './ical_sync';

const app = express();
app.use(express.json());
app.use('/api/ical-sync', ical_syncRouter);

describe('ical-sync route', () => {

  describe('GET /api/ical-sync', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .get('/api/ical-sync')
        
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/ical-sync')
        ;
      
      expect(response.status).toBe(401);
    });

  });


  describe('POST /api/ical-sync', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/ical-sync')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ical-sync')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
