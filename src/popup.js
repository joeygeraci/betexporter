document.addEventListener('DOMContentLoaded', function() {
  var checkPageButton = document.getElementById('exportBets');
  checkPageButton.addEventListener('click', function() {
    chrome.tabs.getSelected(null, function(tab) {

      alert("Hello World");

    });
  }, false);
}, false);