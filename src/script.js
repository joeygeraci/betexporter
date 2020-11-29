


var jq = document.createElement('script');
jq.src = "https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js";
document.getElementsByTagName('head')[0].appendChild(jq);



jQuery.noConflict();
var $ = jQuery;
var data = [];
$table = $('#playerTransactionTable');

$table.find('tr').each(function(n, tr){

	date = $(tr).find('.date-field').text();
	win = $(tr).find('.sportsTxToWin').text().replaceAll(',', '');
	desc = $(tr).find('.subtitle').text().replaceAll(',', '');
	amount = $(tr).find('.amount-balance-field').find('span').data('amount');
	
	line = [ date, win, desc, amount ];
	data.push(line.join(','));

});
data.shift();
var output = data.join('\n');

$('<a></a>')
    .attr('id','exportdata')
    .attr('href','data:text/csv;charset=utf8,' + encodeURIComponent(output))
    .attr('download','exportdata.csv')
    .appendTo('body');
$('#exportdata').ready(function() {
    $('#exportdata').get(0).click();
});




