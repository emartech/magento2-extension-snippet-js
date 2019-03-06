'use strict';

window.Emarsys = window.Emarsys || {};
window.Emarsys.Magento1 = window.Emarsys.Magento1 || {};
window.Emarsys.Magento1.track = function(data) {
  let ScarabQueue = window.ScarabQueue || [];
  data.exchangeRate = data.exchangeRate || 1;

  if (data.customer && data.customer.email) {
    ScarabQueue.push(['setEmail', data.customer.email]);
  }
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
};
