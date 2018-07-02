'use strict';

window.Emarsys = window.Emarsys || {};
window.Emarsys.Magento2 = window.Emarsys.Magento2 || {};
window.Emarsys.Magento2.track = function(data) {
  window.require(['Magento_Customer/js/customer-data'], function(customerData) {
    var ScarabQueue = window.ScarabQueue || [];
    var firstOnData = true;

    const onData = function() {
      if (!data.cart || !(data.customer && data.customer.id)) return;

      ScarabQueue.push(['setCustomerId', data.customer.id]);
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
        ScarabQueue.push([
          'cart',
          data.cart.items.map(product => {
            return {
              item: product.product_sku,
              price: product.product_price_value,
              quantity: product.qty
            };
          })
        ]);
      }
      ScarabQueue.push(['go']);
      firstOnData = false;
    };

    customerData.get('customer').subscribe(function(customer) {
      console.log('customer', customer);
      data.customer = customer;
      onData();
    });

    customerData.get('cart').subscribe(function(cart) {
      console.log('cart', cart);
      data.cart = cart;
      onData();
    });
  });
};
