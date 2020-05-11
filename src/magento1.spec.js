'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const requireUncached = module => {
  delete require.cache[require.resolve(module)];
  return require(module);
};

const testCart = {
  items: [
    {
      product_sku: 'TEST-SKU',
      product_price_value: 1234,
      qty: 42
    },
    {
      product_sku: 'TEST2-SKU',
      product_price_value: 1235,
      qty: 43
    }
  ]
};

const testCustomer = { id: 1, email: 'doge@emarsys.com', name: 'Marton Papp' };

describe('Magento1 Extension', function() {
  beforeEach(function() {
    global.window = { ScarabQueue: [] };
    requireUncached('./magento1');
  });

  it('should push setEmail if customer is available', function() {
    global.window.Emarsys.Magento1.track({ customer: testCustomer });
    expect(global.window.ScarabQueue).to.eql([['setEmail', 'doge@emarsys.com'], ['go']]);
  });

  it('should push cart if cart data is available', function() {
    global.window.Emarsys.Magento1.track({ cart: testCart });
    expect(global.window.ScarabQueue).to.eql([
      [
        'cart',
        [
          {
            item: 'TEST-SKU',
            price: 51828,
            quantity: 42
          },
          {
            item: 'TEST2-SKU',
            price: 53105,
            quantity: 43
          }
        ]
      ],
      ['go']
    ]);
  });

  it('should filter out bundles in cart', function() {
    const testCartWithBundle = {
      items: [
        {
          product_sku: 'TEST-SKU',
          product_price_value: 1234,
          qty: 42
        },
        {
          product_sku: 'TEST2-SKU',
          product_price_value: 1235,
          qty: 43,
          product_type: 'bundle'
        },
        {
          product_sku: 'TEST-SKU-3',
          product_price_value: 1234,
          qty: 42,
          product_type: 'simple'
        }
      ]
    };

    global.window.Emarsys.Magento1.track({ cart: testCartWithBundle });
    expect(global.window.ScarabQueue).to.eql([
      [
        'cart',
        [
          {
            item: 'TEST-SKU',
            price: 51828,
            quantity: 42
          },
          {
            item: 'TEST-SKU-3',
            price: 51828,
            quantity: 42
          }
        ]
      ],
      ['go']
    ]);
  });

  it('should push view event with SKU if product present', function() {
    global.window.Emarsys.Magento1.track({ product: { sku: 'VIEW-SKU' }, customer: testCustomer, cart: testCart });
    expect(global.window.ScarabQueue).to.deep.include(['view', 'g/VIEW-SKU']);
  });

  it('should push category event joined as string if category names present', function() {
    global.window.Emarsys.Magento1.track({ category: { names: ['elso', 'masodik'] } });
    expect(global.window.ScarabQueue).to.deep.include(['category', 'elso > masodik']);
  });

  it('should push purchase event data if order object is present', function() {
    global.window.Emarsys.Magento1.track({
      customer: testCustomer,
      order: {
        orderId: '1',
        items: [{ item: 'SKU-1', price: 100, quantity: 1 }, { item: 'SKU-2', price: 200, quantity: 2 }]
      }
    });
    expect(global.window.ScarabQueue).to.deep.include([
      'purchase',
      {
        orderId: '1',
        items: [{ item: 'SKU-1', price: 100, quantity: 1 }, { item: 'SKU-2', price: 400, quantity: 2 }]
      }
    ]);
  });

  it('should push setEmail with purchase event data if order object is present with email', function() {
    global.window.Emarsys.Magento1.track({
      order: {
        orderId: '1',
        email: 'test@email.com',
        items: [{ item: 'SKU-1', price: 100, quantity: 1 }, { item: 'SKU-2', price: 200, quantity: 2 }]
      }
    });

    expect(global.window.ScarabQueue).to.deep.include(['setEmail', 'test@email.com']);
    expect(global.window.ScarabQueue).to.deep.include([
      'purchase',
      {
        orderId: '1',
        items: [{ item: 'SKU-1', price: 100, quantity: 1 }, { item: 'SKU-2', price: 400, quantity: 2 }]
      }
    ]);

    const setEmailPosition = global.window.ScarabQueue.findIndex(e => e[0] === 'setEmail');
    const purchasePosition = global.window.ScarabQueue.findIndex(e => e[0] === 'purchase');
    expect(purchasePosition).to.be.above(setEmailPosition);
  });

  it('should push searchTerm event if search.term is present', function() {
    global.window.Emarsys.Magento1.track({ search: { term: 'shopify if better than magento' } });
    expect(global.window.ScarabQueue).to.deep.include(['searchTerm', 'shopify if better than magento']);
  });

  it('should convert cart items price to base currency with exchangeRate', function() {
    global.window.Emarsys.Magento1.track({ exchangeRate: 2, cart: testCart });
    expect(global.window.ScarabQueue).to.eql([
      [
        'cart',
        [
          {
            item: 'TEST-SKU',
            price: 25914,
            quantity: 42
          },
          {
            item: 'TEST2-SKU',
            price: 26552.5,
            quantity: 43
          }
        ]
      ],
      ['go']
    ]);
  });

  it('should push availabilityZone, displayCurrency and language with slug if slug is present', function() {
    global.window.Emarsys.Magento1.track({ slug: 'testslug' });
    expect(global.window.ScarabQueue).to.deep.include(['availabilityZone', 'testslug']);
    expect(global.window.ScarabQueue).to.deep.include(['displayCurrency', 'testslug']);
    expect(global.window.ScarabQueue).to.deep.include(['language', 'testslug']);
  });
});
