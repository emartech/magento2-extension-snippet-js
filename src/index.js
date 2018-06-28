'use strict';

Emarsys = Emarsys || {};
Emarsys.Magento2 = Emarsys.Magento2 || {};
Emarsys.Magento2.track = function() {
  window.require(['Magento_Customer/js/customer-data'], function(customerData) {
    console.log(customerData);
  });
};
