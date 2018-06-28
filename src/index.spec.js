'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const requireUncached = module => {
  delete require.cache[require.resolve(module)];
  return require(module);
};

const setupSnippet = customerData => {
  global.window = {
    require: (arr, callback) => {
      callback(customerData);
    },
    ScarabQueue: []
  };
  requireUncached('./');
};

describe('Magento2 Extension', function() {
  it('should register a track function', function() {
    const subscribeStub = () => {};
    const customerData = {
      get() {
        return {
          subscribe: subscribeStub
        };
      }
    };
    setupSnippet(customerData);
    global.window.Emarsys.Magento2.track({});
    expect(global.window.Emarsys.Magento2.track).to.be.a('function');
  });

  it('should push searchTerm if present in customerdata into ScarabQueue', function() {
    const subscribeStub = () => {};
    const customerData = {
      get() {
        return {
          subscribe: subscribeStub
        };
      }
    };
    setupSnippet(customerData);
    global.window.Emarsys.Magento2.track({ searchTerm: 'shopify is better than magento' });
    expect(global.window.ScarabQueue).to.eql([['searchTerm', 'shopify is better than magento'], ['go']]);
  });
});
