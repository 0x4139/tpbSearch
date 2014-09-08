var tpb=require('./index');
tpb.search('Arrow s02e19', {category: '200', orderBy: '7'}, function (dummy, results) {
    console.log(results);
});