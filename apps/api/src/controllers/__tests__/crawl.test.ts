import { crawlController } from '../v0/crawl'
import { Request, Response } from 'express';
import { authenticateUser } from '../auth'; // Ensure this import is correct
import { createIdempotencyKey } from '../../services/idempotency/create';
import { validateIdempotencyKey } from '../../services/idempotency/validate';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../auth', () => ({
  authenticateUser: jest.fn().mockResolvedValue({
    success: true,
    team_id: 'team123',
    error: null,
    status: 200
  }),
  reduce: jest.fn()
}));
jest.mock('../../services/idempotency/validate');

describe('crawlController', () => {
  it('should prevent duplicate requests using the same idempotency key', async () => {
    const req = {
      headers: {
        'x-idempotency-key': await uuidv4(),
        'Authorization': `Bearer ${process.env.TEST_API_KEY}`
      },
      body: {
        url: 'https://mendable.ai'
      }
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;

    // Mock the idempotency key validation to return false for the second call
    (validateIdempotencyKey as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    // First request should succeed
    await crawlController(req, res);
    expect(res.status).not.toHaveBeenCalledWith(409);

    // Second request with the same key should fail
    await crawlController(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Idempotency key already used' });
  });
});