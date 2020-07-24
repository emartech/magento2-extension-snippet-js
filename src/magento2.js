'use strict';

window.Emarsys = window.Emarsys || {};
window.Emarsys.Magento2 = window.Emarsys.Magento2 || {};
window.Emarsys.Magento2.track = function (data) {
  data.order = window.Emarsys.Magento2.orderData;
  data.exchangeRate = data.exchangeRate || 1;
  window.require(['Magento_Customer/js/customer-data'], function (customerData) {
    let firstOnData = true;
    let customerFired = false;
    let timeout;

    const onData = function () {
      let ScarabQueue = window.ScarabQueue || [];

      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }

      if (data.customer && data.customer.email) {
        ScarabQueue.push(['setEmail', data.customer.email]);
      }
      if (firstOnData) {
        if (data.product) {
          const prefix = data.product.isVisibleChild ? '' : 'g/';
          ScarabQueue.push(['view', prefix + data.product.sku]);
        }
        if (!data.product && data.category) {
          ScarabQueue.push(['category', data.category.names.join(' > ')]);
        }
        if (data.search) {
          ScarabQueue.push(['searchTerm', data.search.term]);
        }
        if (data.order) {
          if (data.order.email) {
            ScarabQueue.push(['setEmail', data.order.email]);
            delete data.order.email;
          }
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
          data.cart.items
            .filter((product) => product.product_type !== 'bundle')
            .map((product) => {
              return {
                item: product.product_sku,
                price: (product.product_price_value / data.exchangeRate) * product.qty,
                quantity: product.qty
              };
            })
        ]);
      }
      ScarabQueue.push(['go']);
      firstOnData = false;
    };

    customerData.get('customer').subscribe(function (customer) {
      if (FORCE_CUSTOMER_RELOAD) {
        if (customerFired) return;
        customerFired = true;
      }
      data.customer = customer;
      if (!timeout) timeout = setTimeout(onData, 0);
    });

    if (FORCE_CUSTOMER_RELOAD) {
      if (!customerData.get('customer')().data_id) {
        customerData.reload(['customer'], true);
      }
    }

    customerData.get('cart').subscribe(function (cart) {
      data.cart = cart;
      if (!timeout) timeout = setTimeout(onData, 0);
    });
  });
};
