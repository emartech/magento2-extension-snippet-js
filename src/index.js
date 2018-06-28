'use strict';

window.Emarsys = window.Emarsys || {};
window.Emarsys.Magento2 = window.Emarsys.Magento2 || {};
window.Emarsys.Magento2.track = function() {
  window.require(['Magento_Customer/js/customer-data'], function(customerData) {
    console.log(customerData);
  });
};
