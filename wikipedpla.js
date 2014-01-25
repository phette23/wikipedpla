var wp = {
        'title': $('#firstHeading').text(),
        'categories': [],
        'otherTitles': [],
        'redirects': []
    },
    apiKey = 'e4c036f3302aad8d8c188683967b9619',
    apiBase = 'http://api.dp.la/v2/items',
    catCounter = 0,
    titleCounter = 0,
    dpla = {},
    suggestions = [],
    buildURI = function (query) {
        return apiBase + '?api_key=' + apiKey + '&q=' + encodeURIComponent(query) + '&callback=_handleResponse';
    },
    getCategories = function () {
        $('#mw-normal-catlinks li').each( function (index, el){
            wp.categories.push( $(el).text() );
        });
    },
    getOtherTitles = function () {
        $('.dablink').each(function (index, el){
            test = $(el).text().match('"(.*)" redirects here.' );
            if (test) {
                wp.otherTitles.push(test[1]);
            }
        });
    },
    // getRedirects = function () {
    //     var baseURI = 'https://en.wikipedia.org/w/api.php?redirects&action=query&format=json&titles=';
    //     $.getJSON( baseURI + encodeURIComponent(wp.title), function (json, textStatus){

    //     });
    // },
    getData = function (query) {
        $('body').append('<script src="'+ buildURI(query) +'"></script>');
    },
    _handleResponse = function (data) {
        dpla = data;
        var numResults = dpla.docs.length;

        if (numResults > 0) {
            buildSuggestions(displaySuggestions);
        } else {
            // no objects in query? try otherTitles
            if (titleCounter < wp.otherTitles.length) {
                getData(wp.otherTitles[titleCounter]);
                titleCounter++;
            } else if (catCounter < wp.categories.length) {
                // still nothing? try categories
                getData(wp.categories[catCounter]);
                catCounter++;
            }
        }

    },
    buildSuggestions = function (callback) {
        var items = dpla.docs,
            current = {};

        items.forEach(function (item){
            var res = item.sourceResource;
            current.title = $.isArray( res.title ) ? res.title[0] : res.title;
            current.uri = item.isShownAt;
            current.type = $.isArray( res.type ) ? res.type[1] : res.type;
            current.isImage = isItAnImage(res);
            suggestions.push(current);
            current = {};
        });

        if ( typeof callback === 'function' ) {
            callback();
        }
    },
    displaySuggestions = function () {
        // this is a terrible way to construct HTML
        // TODO: use a legit templating library like Mustache
        var html = '<style>.dp-img:after { content: " "; background: url(https://upload.wikimedia.org/wikipedia/commons/a/a3/VisualEditor_-_Icon_-_Picture.svg); width: 12px; height: 12px; display: inline-block; background-size: 12px 12px;} }</style><div id="wikipedpla" class="dablink" style="display:none;"><a href="http://dp.la">DPLA</a> items of possible interest:',
            last = false;
        suggestions.forEach(function (item, index, array) {
            if (index == array.length - 1) {
                last = true;

            }
            if (last) {
                html += ' & ';
            }
            html += ' <a href="' + item.uri + '"';
            if (item.isImage) {
                html += ' class="dp-img"';
            }
            html += '>' + item.title;
            if (!last) {
                html += '</a>,';
            } else {
                html += '</a>.';
            }
        });
        html += '</div>';
        $('#mw-content-text').prepend(html);
        $('#wikipedpla').show('slow');
    },
    isItAnImage = function (resource) {
        var t = resource.type;
        if ($.isArray(type)) {
            for (var type in t) {
                if ( type == 'Image' ) {
                    return true;
                }
            }
            return false;
        } else if ( t && t.toLowerCase() === 'image' ) {
            return true;
        } else {
            return false;
        }
    },
    init = function () {
        // only execute on the Main (Articles) namespace
        // the first tab, text "Articles", has an id
        // of form "cs-nstab-$NAMESPACE"
        var id = $('li[id^="ca-nstab-"]').attr('id');

        // ensure callback function is in the global scope
        if (!window._handleResponse) {
            window._handleResponse = _handleResponse;
        }
        if ( id.substr(-4) === 'main' ) {
            getCategories();
            getOtherTitles();
            getData(wp.title);
        }
    };


init();
