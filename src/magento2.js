'use strict';

window.Emarsys = window.Emarsys || {};
window.Emarsys.Magento2 = window.Emarsys.Magento2 || {};
window.Emarsys.Magento2.track = function(data) {
  data.order = window.Emarsys.Magento2.orderData;
  data.exchangeRate = data.exchangeRate || 1;
  window.require(['Magento_Customer/js/customer-data'], function(customerData) {
    let ScarabQueue = window.ScarabQueue || [];
    let firstOnData = true;
    let timeout;

    const onData = function() {
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }

      if (data.customer && data.customer.email) {
        ScarabQueue.push(['setEmail', data.customer.email]);
      }
      if (firstOnData) {
        if (data.product) {
          ScarabQueue.push(['view', 'g/' + data.product.sku]);
        }
        if (!data.product && data.category) {
          ScarabQueue.push(['category', data.category.names.join(' > ')]);
        }
        if (data.search) {
          ScarabQueue.push(['searchTerm', data.search.term]);
        }
        if (data.order) {
          ScarabQueue.push(['purchase', data.order]);
        }
        if (data.slug) {
          ScarabQueue.push(['availabilityZone', data.slug]);
          ScarabQueue.push(['displayCurrency', data.slug]);
          ScarabQueue.push(['language', data.slug]);
        }
      }
      if (data.cart) {
        ScarabQueue.push([
          'cart',
          data.cart.items.map(product => {
            return {
              item: product.product_sku,
              price: product.product_price_value / data.exchangeRate,
              quantity: product.qty
            };
          })
        ]);
      }
      ScarabQueue.push(['go']);
      firstOnData = false;
    };

    customerData.get('customer').subscribe(function(customer) {
      data.customer = customer;
      if (!timeout) timeout = setTimeout(onData, 0);
    });

    customerData.get('cart').subscribe(function(cart) {
      data.cart = cart;
      if (!timeout) timeout = setTimeout(onData, 0);
    });
  });
};
