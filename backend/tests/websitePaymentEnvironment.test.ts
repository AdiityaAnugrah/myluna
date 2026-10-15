import { websitePaymentEnvironment } from '../src/utils/websitePaymentEnvironment';

describe('website payment environment boundary', () => {
  test.each([
    [{}, 'production'],
    [{ customer_email: 'buyer@example.test' }, 'production'],
    [{ is_test: 1 }, 'sandbox'],
    [{ is_test: '1' }, 'sandbox'],
    [{ is_test: 'false' }, 'production'],
    [{ payment_environment: 'sandbox' }, 'sandbox'],
    [{ payment_environment: 'production', is_test: true }, 'sandbox'],
    [{ payment_environment: 'production', data_mid: { _app_payment_environment: 'sandbox' } }, 'sandbox'],
    [{ data_mid: JSON.stringify({ _app_payment_environment: 'sandbox' }) }, 'sandbox'],
    [{ payment_environment: 'production', customer_email: 'lunareafurniture@gmail.com' }, 'production'],
    [{ customer_email: ' LUNAREAFURNITURE@gmail.com ' }, 'sandbox'],
    [{ payment_environment: 'typo' }, 'invalid'],
  ])('resolves %j to %s', (body, expected) => expect(websitePaymentEnvironment(body)).toBe(expected));
});
