'use strict';

window.Emarsys = window.Emarsys || {};
window.Emarsys.Magento2 = window.Emarsys.Magento2 || {};
window.Emarsys.Magento2.track = function(data) {
  console.log('data', data);
  window.require(['Magento_Customer/js/customer-data'], function(customerData) {
    var ScarabQueue = window.ScarabQueue || [];

    customerData.get('customer').subscribe(function(customer) {
      console.log('customer', customer);
      data.customer = customer;
    });

    if (data.searchTerm) {
      ScarabQueue.push(['searchTerm', data.searchTerm]);
    }

    ScarabQueue.push(['go']);
  });
};
