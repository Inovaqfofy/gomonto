import request from 'supertest';
import express from 'express';
import { owner_apiRouter } from './owner_api';

const app = express();
app.use(express.json());
app.use('/api/owner-api', owner_apiRouter);

describe('owner-api route', () => {

  describe('GET /api/owner-api', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .get('/api/owner-api')
        
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/owner-api')
        ;
      
      expect(response.status).toBe(401);
    });

  });


  describe('POST /api/owner-api', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/owner-api')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/owner-api')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
