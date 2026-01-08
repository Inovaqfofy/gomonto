import request from 'supertest';
import express from 'express';
import { kyc_document_accessRouter } from './kyc_document_access';

const app = express();
app.use(express.json());
app.use('/api/kyc-document-access', kyc_document_accessRouter);

describe('kyc-document-access route', () => {

  describe('POST /api/kyc-document-access', () => {
    it('should respond successfully', async () => {
      const response = await request(app)
        .post('/api/kyc-document-access')
        .send({ test: true })
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBeLessThan(500);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/kyc-document-access')
        .send({ test: true });
      
      expect(response.status).toBe(401);
    });

  });

});
