/**
 * Wrapper subscriber for jQuery dForm plugin
 *
 * Usage :
 *
 *  {
 *      "type":     "text",
 *      "name":     "last_name",
 *      "caption":  "Last name",
 *      "wrapper":  "p"
 *  }
 *
 *  result :
 *  <p><label class="ui-dform-label">Last name</label><input type="text" name="last_name" class="ui-dform-text"></p>
 *
 *  or
 *
  *  {
 *      "type":     "text",
 *      "name":     "last_name",
 *      "caption":  "Last name",
 *      "wrapper":  {
 *          "tag":      "p",
 *          "class":    "myclass",
 *          "style":    "color: green;"
 *      }
 *  }
 *
 *  result :
 *  <p class="myclass" style="color: green;"><label class="ui-dform-label">Last name</label><input type="text" name="last_name" class="ui-dform-text"></p>
 *
 *  Subcriber options are wrapper's HTML attributes, except "tag" which is its HTML tag
 */

Object.keys = Object.keys || (function () {
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !{toString:null}.propertyIsEnumerable("toString"),
        DontEnums = [
            'toString',
            'toLocaleString',
            'valueOf',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'constructor'
        ],
        DontEnumsLength = DontEnums.length;

    return function (o) {
        if (typeof o != "object" && typeof o != "function" || o === null)
            throw new TypeError("Object.keys called on a non-object");

        var result = [];
        for (var name in o) {
            if (hasOwnProperty.call(o, name))
                result.push(name);
        }

        if (hasDontEnumBug) {
            for (var i = 0; i < DontEnumsLength; i++) {
                if (hasOwnProperty.call(o, DontEnums[i]))
                    result.push(DontEnums[i]);
            }
        }

        return result;
    };
})();

(function($){

$.dform.subscribe('wrapper', function(options, type) {

    // Building the wrapper
    var wrapper = $('<div />');     // Default wrapper
    if(typeof(options) == 'string') {
        wrapper = $('<' + options + ' />');
    } else {
        if(options.tag !== undefined) {
            wrapper = $('<' + options.tag + ' />');
            delete options.tag;
        }

        if(typeof(options) == 'object' && Object.keys(options).length > 0) {
            wrapper.attr(options);
        }
    }

    // Selecting items to wrap (field + label)
    var selection = this;
    if(type == 'radio' || type == 'checkbox') {
        selection = selection.add(selection.next('label'));
    } else {
        selection = selection.add(selection.prev('label'));
    }

    // Wrapping
    selection.wrapAll(wrapper);
});


$.dform.removeSubscription('options');

$.dform.subscribe({
    options : function(options, type)
    {
        var scoper = $(this);
        if (type == "select" || type == "optgroup") // Options for select elements
        {
            // TODO optgroup
            $.each(options, function(value, content)
            {
                var option = { type : 'option' };
                if (typeof (content) == "string") {
                    option.value = value;
                    option.html = content;
                }
                if (typeof (content) == "object") {
                    option = $.extend(option, content);
                }
                $(scoper).formElement(option);
            });
        }
        else if(type == "checkboxes" || type == "radiobuttons")
        {
            // Options for checkbox and radiobutton lists
            var scoper = this;
            $.each(options, function(value, content) {
                var boxoptions = ((type == "radiobuttons") ? { "type" : "radio" } : { "type" : "checkbox" });
                if(typeof(content) == "string")
                    boxoptions["caption"] = content;
                else
                    $.extend(boxoptions, content);
                boxoptions["value"] = value;
                $(scoper).formElement(boxoptions);
            });
        }
    }
});

})(jQuery);
