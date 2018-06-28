'use strict';

window.Emarsys = window.Emarsys || {};
window.Emarsys.Magento2 = window.Emarsys.Magento2 || {};
window.Emarsys.Magento2.track = function(data) {
  console.log('data', data);
  window.require(['Magento_Customer/js/customer-data'], function(customerData) {
    var ScarabQueue = window.ScarabQueue || [];
    var firstOnData = true;

    const onData = function() {
      ScarabQueue.push(['setCustomerId', data.customer.entity_id]);
      if (firstOnData) {
        if (data.product) {
          ScarabQueue.push(['view', 'g/' + data.product.sku]);
        }
        if (data.category) {
          ScarabQueue.push(['category', data.category.names.join(' > ')]);
        }
        if (data.search) {
          ScarabQueue.push(['searchTerm', data.search.term]);
        }
      }
      if (data.cart) {
        ScarabQueue.push(['cart', data.cart.items]);
      }
      ScarabQueue.push(['go']);
      firstOnData = false;
    };

    customerData.get('customer').subscribe(function(customer) {
      console.log('customer', customer);
      data.customer = customer;
      if (data.customer && data.cart) onData();
    });

    customerData.get('cart').subscribe(function(cart) {
      console.log('cart', cart);
      data.cart = cart;
      if (data.customer && data.cart) onData();
    });
  });
};
