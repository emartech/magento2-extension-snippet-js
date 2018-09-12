'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const requireUncached = module => {
  delete require.cache[require.resolve(module)];
  return require(module);
};

const setupSnippet = function() {
  let callbacks = {};
  global.window = {
    require: function(arr, requireCallback) {
      requireCallback({
        get: function(name) {
          return {
            subscribe: function(callback) {
              callbacks[name] = callback;
            }
          };
        }
      });
    },
    ScarabQueue: []
  };
  requireUncached('./');
  return callbacks;
};

const testCart = {
  items: [
    {
      product_sku: 'TEST-SKU',
      product_price_value: 1234,
      qty: 42
    }
  ]
};

const testCart2 = {
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

describe('Magento2 Extension', function() {
  let clock;

  beforeEach(function() {
    clock = sinon.useFakeTimers();
  });

  afterEach(function() {
    clock.restore();
  });

  it('should register a track function', function() {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ a: 'b' });
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.Emarsys.Magento2.track).to.be.a('function');
  });

  it('should insert data into scarabqueue if only customer observable triggered', function() {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({});
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.eql([['setEmail', 'doge@emarsys.com'], ['go']]);
  });

  it('should insert data into scarabqueue if only cart observable triggered', function() {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({});
    callbacks.cart(testCart);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.eql([
      [
        'cart',
        [
          {
            item: 'TEST-SKU',
            price: 1234,
            quantity: 42
          }
        ]
      ],
      ['go']
    ]);
  });

  // eslint-disable-next-line max-len
  it('should insert only cart data into scarabqueue if cart and customer is triggered but without a customer id', function() {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({});
    callbacks.cart(testCart);
    callbacks.customer({ no_id: 'I dont have an ID sorry :(' });
    clock.tick(0);
    expect(global.window.ScarabQueue).to.eql([
      [
        'cart',
        [
          {
            item: 'TEST-SKU',
            price: 1234,
            quantity: 42
          }
        ]
      ],
      ['go']
    ]);
  });

  it('should push customer and cart related data into scarabqueue if both triggered', function() {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({});
    callbacks.customer(testCustomer);
    callbacks.cart(testCart);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.eql([
      ['setEmail', 'doge@emarsys.com'],
      [
        'cart',
        [
          {
            item: 'TEST-SKU',
            price: 1234,
            quantity: 42
          }
        ]
      ],
      ['go']
    ]);
  });

  it('should push customer and cart related data into scarabqueue after both triggered (different order)', function() {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({});
    callbacks.cart(testCart);
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.eql([
      ['setEmail', 'doge@emarsys.com'],
      [
        'cart',
        [
          {
            item: 'TEST-SKU',
            price: 1234,
            quantity: 42
          }
        ]
      ],
      ['go']
    ]);
  });

  it('should push view event with SKU if product present', function() {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ product: { sku: 'VIEW-SKU' } });
    callbacks.cart(testCart);
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.deep.include(['view', 'g/VIEW-SKU']);
  });

  it('should push category event joined as string if category names present', function() {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ category: { names: ['elso', 'masodik'] } });
    callbacks.cart(testCart);
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.deep.include(['category', 'elso > masodik']);
  });

  it('should push purchase event data if order object is present', function() {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.orderData = {
      orderId: '1',
      items: [{ item: 'SKU-1', price: 100, quantity: 1 }, { item: 'SKU-2', price: 200, quantity: 2 }]
    };

    global.window.Emarsys.Magento2.track({});
    callbacks.cart(testCart);
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.deep.include([
      'purchase',
      {
        orderId: '1',
        items: [{ item: 'SKU-1', price: 100, quantity: 1 }, { item: 'SKU-2', price: 200, quantity: 2 }]
      }
    ]);
  });

  it('should push searchTerm event if search.term is present', function() {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ search: { term: 'shopify if better than magento' } });
    callbacks.cart(testCart);
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.deep.include(['searchTerm', 'shopify if better than magento']);
  });

  it('should only push cart and customer data from the second call', function() {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ search: { term: 'shopify if better than magento' } });
    callbacks.cart(testCart);
    callbacks.customer(testCustomer);

    callbacks.cart(testCart);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.eql([
      ['setEmail', 'doge@emarsys.com'],
      ['searchTerm', 'shopify if better than magento'],
      [
        'cart',
        [
          {
            item: 'TEST-SKU',
            price: 1234,
            quantity: 42
          }
        ]
      ],
      ['go']
    ]);
  });

  it('should push data call go again if cart triggered second time', function() {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ search: { term: 'shopify if better than magento' } });
    callbacks.cart(testCart);
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.eql([
      ['setEmail', 'doge@emarsys.com'],
      ['searchTerm', 'shopify if better than magento'],
      [
        'cart',
        [
          {
            item: 'TEST-SKU',
            price: 1234,
            quantity: 42
          }
        ]
      ],
      ['go']
    ]);

    callbacks.cart(testCart2);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.eql([
      ['setEmail', 'doge@emarsys.com'],
      ['searchTerm', 'shopify if better than magento'],
      [
        'cart',
        [
          {
            item: 'TEST-SKU',
            price: 1234,
            quantity: 42
          }
        ]
      ],
      ['go'],
      ['setEmail', 'doge@emarsys.com'],
      [
        'cart',
        [
          {
            item: 'TEST-SKU',
            price: 1234,
            quantity: 42
          },
          {
            item: 'TEST2-SKU',
            price: 1235,
            quantity: 43
          }
        ]
      ],
      ['go']
    ]);
  });

  it('should convert cart items price to base currency with exchangeRate', function() {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ exchangeRate: 2 });
    callbacks.cart(testCart);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.eql([
      [
        'cart',
        [
          {
            item: 'TEST-SKU',
            price: 617,
            quantity: 42
          }
        ]
      ],
      ['go']
    ]);
  });
});
