import axios from 'axios';
import { customersApi, CUSTOMERS_ROUTE } from './customersApi';
jest.mock('axios', () => {
  const client = { get: jest.fn(), post: jest.fn() };
  return { create: () => client, testClient: client };
});
test('search terms travel only in the POST body and browse has no search parameter', () => {
  const client = axios.testClient;
  const api = customersApi('token-a', 7);
  const signal = new AbortController().signal;
  api.list(2, 25, signal, ' person@example.com ');
  expect(client.post).toHaveBeenCalledWith(`${CUSTOMERS_ROUTE}/search`,
    { page: 2, limit: 25, search: 'person@example.com' }, expect.objectContaining({ signal }));
  api.list(1, 25, signal, '');
  expect(client.get).toHaveBeenCalledWith(CUSTOMERS_ROUTE, expect.objectContaining({ params: { page: 1, limit: 25 } }));
});
test('creation pins auth/company and passes intent without automatic retries', () => {
  const client = axios.testClient;
  const body = { operation_key: 'synthetic', expected_version: 0, profile: {} };
  const signal = new AbortController().signal;
  customersApi('token-a', 7).create(body, signal);
  expect(client.post).toHaveBeenCalledTimes(1);
  expect(client.post).toHaveBeenCalledWith(CUSTOMERS_ROUTE, body, {
    headers: { Authorization: 'Bearer token-a', 'X-Active-Org': '7' }, signal,
  });
});
