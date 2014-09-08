var baseUrl, cheerio, getCategories, parseCategories, parsePage, parseResults, recentTorrents, search, topTorrents;
var request = require('request');
var zlib = require('zlib');
cheerio = require('cheerio');

var headers = {
    "accept-charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.3",
    "accept-language": "en-US,en;q=0.8",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13+ (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2",
    "accept-encoding": "gzip,deflate",
};


var requestWithEncoding = function (options, callback) {
    var req = request.get(options);

    req.on('response', function (res) {
        var chunks = [];
        res.on('data', function (chunk) {
            chunks.push(chunk);
        });

        res.on('end', function () {
            var buffer = Buffer.concat(chunks);
            var encoding = res.headers['content-encoding'];
            if (encoding == 'gzip') {
                zlib.gunzip(buffer, function (err, decoded) {
                    callback(err, decoded && decoded.toString());
                });
            } else if (encoding == 'deflate') {
                zlib.inflate(buffer, function (err, decoded) {
                    callback(err, decoded && decoded.toString());
                })
            } else {
                callback(null, buffer.toString());
            }
        });
    });

    req.on('error', function (err) {
        callback(err);
    });
}


baseUrl = 'http://thepiratebay.se';
/*
 *opts:
 *  category
 *    0   - all
 *    101 - 699
 *  page
 *    0 - 99
 *  orderBy
 *     1  - name desc
 *     2  - name asc
 *     3  - date desc
 *     4  - date asc
 *     5  - size desc
 *     6  - size asc
 *     7  - seeds desc
 *     8  - seeds asc
 *     9  - leeches desc
 *     10 - leeches asc
 */


search = function (title, opts, cb) {
    var query;
    if (opts == null) {
        opts = {};
    }
    query = {
        url: baseUrl + '/search/' + title || '' + '/' + opts.page || '0' + '/' + opts.orderBy || '99' + '/' + opts.category || '0' + '/',
        headers: headers
    };
    return parsePage(query, parseResults, cb);
};

topTorrents = function (category, cb) {
    if (category == null) {
        category = 'all';
    }
    return parsePage(baseUrl + '/top/' + category, parseResults, cb);
};

recentTorrents = function (cb) {
    return parsePage(baseUrl + '/recent', parseResults, cb);
};

getCategories = function (cb) {
    return parsePage(baseUrl + '/recent', parseCategories, cb);
};

parsePage = function (url, parse, cb) {
    if (typeof cb === 'function') {
        requestWithEncoding(url, function (err, body) {
            var categories;
            if (err != null) {
                cb(err);
            }
            categories = parse(body);
            return cb(null, categories);
        });
    }
};

parseCategories = function (categoriesHTML) {
    var $, categories, categoriesContainer, currentCategoryId;
    $ = cheerio.load(categoriesHTML);
    categoriesContainer = $('select#category optgroup');
    currentCategoryId = 0;
    categories = categoriesContainer.map(function (elem) {
        var category;
        currentCategoryId += 100;
        category = {
            name: $(this).attr('label'),
            id: currentCategoryId + '',
            subcategories: []
        };
        $(this).find('option').each(function (opt) {
            var subcategory;
            subcategory = {
                id: $(this).attr('value'),
                name: $(this).text()
            };
            return category.subcategories.push(subcategory);
        });
        return category;
    });
    return categories.get();
};

parseResults = function (resultsHTML) {
    var $, rawResults, results;
    $ = cheerio.load(resultsHTML);
    rawResults = $('table#searchResult tr:has(a.detLink)');
    results = rawResults.map(function (elem) {
        var category, leechers, link, magnetLink, name, result, seeders, size, subcategory, torrentLink, uploadDate;
        name = $(this).find('a.detLink').text();
        uploadDate = $(this).find('font').text().match(/Uploaded\s(?:<b>)?(.+?)(?:<\/b>)?,/)[1];
        size = $(this).find('font').text().match(/Size (.+?),/)[1];
        seeders = $(this).find('td[align="right"]').first().text();
        leechers = $(this).find('td[align="right"]').next().text();
        link = baseUrl + $(this).find('div.detName a').attr('href');
        magnetLink = $(this).find('a[title="Download this torrent using magnet"]').attr('href');
        torrentLink = $(this).find('a[title="Download this torrent"]').attr('href');
        category = {
            id: $(this).find('center a').first().attr('href').match(/\/browse\/(\d+)/)[1],
            name: $(this).find('center a').first().text()
        };
        subcategory = {
            id: $(this).find('center a').last().attr('href').match(/\/browse\/(\d+)/)[1],
            name: $(this).find('center a').last().text()
        };
        return result = {
            name: name,
            size: size,
            link: link,
            category: category,
            seeders: seeders,
            leechers: leechers,
            uploadDate: uploadDate,
            magnetLink: magnetLink,
            subcategory: subcategory,
            torrentLink: torrentLink
        };
    });
    return results.get();
};

module.exports = {
    search: search,
    topTorrents: topTorrents,
    recentTorrents: recentTorrents,
    getCategories: getCategories
};
