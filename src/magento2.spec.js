'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const requireUncached = (module) => {
  delete require.cache[require.resolve(module)];
  return require(module);
};

const reloadSpy = sinon.spy();
const setupSnippet = function ({ dataId } = {}) {
  let callbacks = {};

  const getObjectOrFunction = function () {
    return {
      data_id: dataId
    };
  };

  global.window = {
    require: function (arr, requireCallback) {
      requireCallback({
        get: function (name) {
          getObjectOrFunction.subscribe = function (callback) {
            callbacks[name] = callback;
          };
          return getObjectOrFunction;
        },
        reload: function () {
          reloadSpy(...arguments);
        }
      });
    },
    ScarabQueue: []
  };
  requireUncached('./magento2');
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

const testCustomer = { id: 49234, email: 'doge@emarsys.com', name: 'Marton Papp' };

describe('Magento2 Extension', function () {
  let clock;

  beforeEach(function () {
    global.CONTACT_IDENTIFIER = 'email';
    global.FORCE_CUSTOMER_RELOAD = false;
    clock = sinon.useFakeTimers();
    reloadSpy.resetHistory();
  });

  afterEach(function () {
    clock.restore();
  });

  [
    { identifier: 'email', expectedQueueItem: ['setEmail', testCustomer.email] },
    { identifier: 'id', expectedQueueItem: ['setCustomerId', testCustomer.id] }
  ].forEach((testCase) => {
    context(`if contact identifier is set to ${testCase.identifier}`, function () {
      beforeEach(function () {
        global.CONTACT_IDENTIFIER = testCase.identifier;
      });

      it('should insert data into scarabqueue if only customer observable triggered', function () {
        const callbacks = setupSnippet();
        global.window.Emarsys.Magento2.track({});
        callbacks.customer(testCustomer);
        clock.tick(0);
        expect(global.window.ScarabQueue).to.eql([testCase.expectedQueueItem, ['go']]);
      });

      // eslint-disable-next-line max-len
      it(`should insert only cart data into scarabqueue if cart and customer is triggered but without a customer ${testCase.identifier}`, function () {
        const callbacks = setupSnippet();
        global.window.Emarsys.Magento2.track({});
        callbacks.cart(testCart);
        callbacks.customer({ no_id: 'I dont have an ID or Email sorry :(' });
        clock.tick(0);
        expect(global.window.ScarabQueue).to.eql([
          [
            'cart',
            [
              {
                item: 'TEST-SKU',
                price: 51828,
                quantity: 42
              }
            ]
          ],
          ['go']
        ]);
      });

      it('should push customer and cart related data into scarabqueue if both triggered', function () {
        const callbacks = setupSnippet();
        global.window.Emarsys.Magento2.track({});

        const testCartWithBundle = {
          items: [
            {
              product_sku: 'TEST-SKU',
              product_price_value: 1234,
              qty: 42
            },
            {
              product_sku: 'BUNDLE-SKU-NORMAL-SKU',
              product_price_value: 999,
              qty: 50,
              product_type: 'bundle'
            }
          ]
        };

        callbacks.customer(testCustomer);
        callbacks.cart(testCartWithBundle);
        clock.tick(0);
        expect(global.window.ScarabQueue).to.eql([
          testCase.expectedQueueItem,
          [
            'cart',
            [
              {
                item: 'TEST-SKU',
                price: 51828,
                quantity: 42
              }
            ]
          ],
          ['go']
        ]);
      });

      it('should filter bundles in cart', function () {
        const callbacks = setupSnippet();
        global.window.Emarsys.Magento2.track({});
        callbacks.customer(testCustomer);
        callbacks.cart(testCart);
        clock.tick(0);
        expect(global.window.ScarabQueue).to.eql([
          testCase.expectedQueueItem,
          [
            'cart',
            [
              {
                item: 'TEST-SKU',
                price: 51828,
                quantity: 42
              }
            ]
          ],
          ['go']
        ]);
      });

      // eslint-disable-next-line max-len
      it('should push customer and cart related data into scarabqueue after both triggered (different order)', function () {
        const callbacks = setupSnippet();
        global.window.Emarsys.Magento2.track({});
        callbacks.cart(testCart);
        callbacks.customer(testCustomer);
        clock.tick(0);
        expect(global.window.ScarabQueue).to.eql([
          testCase.expectedQueueItem,
          [
            'cart',
            [
              {
                item: 'TEST-SKU',
                price: 51828,
                quantity: 42
              }
            ]
          ],
          ['go']
        ]);
      });

      it('should only push cart and customer data from the second call', function () {
        const callbacks = setupSnippet();
        global.window.Emarsys.Magento2.track({ search: { term: 'shopify if better than magento' } });
        callbacks.cart(testCart);
        callbacks.customer(testCustomer);

        callbacks.cart(testCart);
        clock.tick(0);
        expect(global.window.ScarabQueue).to.eql([
          testCase.expectedQueueItem,
          ['searchTerm', 'shopify if better than magento'],
          [
            'cart',
            [
              {
                item: 'TEST-SKU',
                price: 51828,
                quantity: 42
              }
            ]
          ],
          ['go']
        ]);
      });

      it('should push data call go again if cart triggered second time', function () {
        const callbacks = setupSnippet();
        global.window.Emarsys.Magento2.track({ search: { term: 'shopify if better than magento' } });
        callbacks.cart(testCart);
        callbacks.customer(testCustomer);
        clock.tick(0);
        expect(global.window.ScarabQueue).to.eql([
          testCase.expectedQueueItem,
          ['searchTerm', 'shopify if better than magento'],
          [
            'cart',
            [
              {
                item: 'TEST-SKU',
                price: 51828,
                quantity: 42
              }
            ]
          ],
          ['go']
        ]);

        callbacks.cart(testCart2);
        clock.tick(0);
        expect(global.window.ScarabQueue).to.eql([
          testCase.expectedQueueItem,
          ['searchTerm', 'shopify if better than magento'],
          [
            'cart',
            [
              {
                item: 'TEST-SKU',
                price: 51828,
                quantity: 42
              }
            ]
          ],
          ['go'],
          testCase.expectedQueueItem,
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
    });
  });

  context('if contact identifier is set to email', function () {
    beforeEach(function () {
      global.CONTACT_IDENTIFIER = 'email';
    });

    it('should push setEmail with purchase event data if order object is present with email', function () {
      const callbacks = setupSnippet();
      global.window.Emarsys.Magento2.orderData = {
        orderId: '1',
        email: 'test@email.com',
        items: [
          { item: 'SKU-1', price: 100, quantity: 1 },
          { item: 'SKU-2', price: 200, quantity: 2 }
        ]
      };

      global.window.Emarsys.Magento2.track({});
      callbacks.cart(testCart);
      clock.tick(0);

      expect(global.window.ScarabQueue).to.deep.include(['setEmail', 'test@email.com']);
      expect(global.window.ScarabQueue).to.deep.include([
        'purchase',
        {
          orderId: '1',
          items: [
            { item: 'SKU-1', price: 100, quantity: 1 },
            { item: 'SKU-2', price: 200, quantity: 2 }
          ]
        }
      ]);

      const setEmailPosition = global.window.ScarabQueue.findIndex((e) => e[0] === 'setEmail');
      const purchasePosition = global.window.ScarabQueue.findIndex((e) => e[0] === 'purchase');
      expect(purchasePosition).to.be.above(setEmailPosition);
    });
  });

  context('if contact identifier is set to id', function () {
    beforeEach(function () {
      global.CONTACT_IDENTIFIER = 'id';
    });

    it('should not push setEmail with purchase event data if order object is present with email', function () {
      const callbacks = setupSnippet();
      global.window.Emarsys.Magento2.orderData = {
        orderId: '1',
        email: 'test@email.com',
        items: [
          { item: 'SKU-1', price: 100, quantity: 1 },
          { item: 'SKU-2', price: 200, quantity: 2 }
        ]
      };

      global.window.Emarsys.Magento2.track({});
      callbacks.cart(testCart);
      clock.tick(0);

      expect(global.window.ScarabQueue).not.to.deep.include(['setEmail', 'test@email.com']);
      expect(global.window.ScarabQueue).to.deep.include([
        'purchase',
        {
          orderId: '1',
          items: [
            { item: 'SKU-1', price: 100, quantity: 1 },
            { item: 'SKU-2', price: 200, quantity: 2 }
          ]
        }
      ]);
    });
  });

  it('should register a track function', function () {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ a: 'b' });
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.Emarsys.Magento2.track).to.be.a('function');
  });

  it('should insert data into scarabqueue if only cart observable triggered', function () {
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
            price: 51828,
            quantity: 42
          }
        ]
      ],
      ['go']
    ]);
  });

  it('should push view event with SKU prefixed with g/ if product present without isVisibleChild flag', function () {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ product: { sku: 'VIEW-SKU' } });
    callbacks.cart(testCart);
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.deep.include(['view', 'g/VIEW-SKU']);
  });

  it('should push view event with SKU prefixed with g/ if product present with isVisibleChild false', function () {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ product: { sku: 'VIEW-SKU', isVisibleChild: false } });
    callbacks.cart(testCart);
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.deep.include(['view', 'g/VIEW-SKU']);
  });

  it('should push view event with SKU without g/ prefix if product present with isVisibleChild true', function () {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ product: { sku: 'VIEW-SKU', isVisibleChild: true } });
    callbacks.cart(testCart);
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.deep.include(['view', 'VIEW-SKU']);
  });

  it('should push category event joined as string if category names present', function () {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ category: { names: ['elso', 'masodik'] } });
    callbacks.cart(testCart);
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.deep.include(['category', 'elso > masodik']);
  });

  it('should push purchase event data if order object is present', function () {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.orderData = {
      orderId: '1',
      items: [
        { item: 'SKU-1', price: 100, quantity: 1 },
        { item: 'SKU-2', price: 200, quantity: 2 }
      ]
    };

    global.window.Emarsys.Magento2.track({});
    callbacks.cart(testCart);
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.deep.include([
      'purchase',
      {
        orderId: '1',
        items: [
          { item: 'SKU-1', price: 100, quantity: 1 },
          { item: 'SKU-2', price: 200, quantity: 2 }
        ]
      }
    ]);
  });

  it('should push searchTerm event if search.term is present', function () {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ search: { term: 'shopify if better than magento' } });
    callbacks.cart(testCart);
    callbacks.customer(testCustomer);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.deep.include(['searchTerm', 'shopify if better than magento']);
  });

  it('should convert cart items price to base currency with exchangeRate', function () {
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
            price: 25914,
            quantity: 42
          }
        ]
      ],
      ['go']
    ]);
  });

  it('should push availabilityZone, displayCurrency and language with slug if slug is present', function () {
    const callbacks = setupSnippet();
    global.window.Emarsys.Magento2.track({ slug: 'testslug' });
    callbacks.cart(testCart);
    clock.tick(0);
    expect(global.window.ScarabQueue).to.deep.include(['availabilityZone', 'testslug']);
    expect(global.window.ScarabQueue).to.deep.include(['displayCurrency', 'testslug']);
    expect(global.window.ScarabQueue).to.deep.include(['language', 'testslug']);
  });

  context('after version 2.3.3', function () {
    beforeEach(function () {
      global.FORCE_CUSTOMER_RELOAD = true;
    });
    [
      { identifier: 'email', expectedQueueItem: ['setEmail', testCustomer.email] },
      { identifier: 'id', expectedQueueItem: ['setCustomerId', testCustomer.id] }
    ].forEach((testCase) => {
      context(`if contact identifier is set to ${testCase.identifier}`, function () {
        beforeEach(function () {
          global.CONTACT_IDENTIFIER = testCase.identifier;
        });

        it('should insert data into scarabqueue if only customer observable triggered but only once', function () {
          const callbacks = setupSnippet();
          global.window.Emarsys.Magento2.track({});

          callbacks.customer(testCustomer);
          clock.tick(0);

          callbacks.customer(testCustomer);
          clock.tick(0);

          expect(global.window.ScarabQueue).to.eql([testCase.expectedQueueItem, ['go']]);
        });
      });
    });

    it('should call reload if current customers data_id is undefined', function () {
      setupSnippet({ dataId: undefined });
      global.window.Emarsys.Magento2.track({});

      expect(reloadSpy).to.have.been.calledWith(['customer'], true);
    });

    it('should NOT call reload if current customers data_id is set', function () {
      setupSnippet({ dataId: 1234 });
      global.window.Emarsys.Magento2.track({});

      expect(reloadSpy).not.to.have.been.called;
    });
  });
});
