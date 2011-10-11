jQuery(function($){

Backbone.emulateHTTP = true;

/*
 * MODELS : Document, Tag
 */

var Tag = Backbone.Model.extend({

    urlRoot: '/tags',

    url : function(){
        var base = this.urlRoot || urlError();
        if (this.isNew()) return base;
        return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    initialize: function(){
        this.id = this.get('_id') || null;
    },

    // backbone-form:
    schema: {
        label: { type: 'Text' }
    },

});

var Document = Backbone.Model.extend({

    urlRoot: '/documents',

    url : function(){
        var base = this.urlRoot || urlError();
        if (this.isNew()) return base;
        return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    initialize: function(){
        this.id = this.get('_id') || null;
    },


    // backbone-form:
    schema: {
        title: { type: 'Text' },
        description: { type: 'TextArea' },
        tags: { type: 'Text' },
        //updated_at: { type: 'Text' },
    },

});

/*
 * COLLECTIONS : Documents
 */

var Documents = Backbone.Collection.extend({

    model: Document,
    dir: '',
    tags: [],

    url: function(){
        var query = [];

        // tags
        if ((tags = this.realtags()).length){
            query.push('tags[]=' + tags.join('&tags[]='));
        }

        return '/documents' + (query.length ? '?' + query.join('&') : '');
    },

    realtags: function(){
        return this.tags.concat(this.dir).filter(function(e){return e});
    },

    // url for navigation
    genUrl: function(){
        //app_router.navigate('tags/' + this.collection.tags.join('&'));
        return 'tags/' + this.realtags().join('&');
    },

    addTag: function(tag){
        if (this.tags.indexOf(tag) != -1) return false;

        if (tag.indexOf('::') == 0){
            this.tags = _.select(this.tags, function(tag){ return tag.indexOf('::') == -1; });
            this.tags.unshift(tag);
        } else {
            this.tags.push(tag);
        }

        this.fetch();
        return true;
    },

    removeTag: function(tag){
        if (this.tags.indexOf(tag) == -1) return false;
        this.tags.splice(this.tags.indexOf(tag), 1);
        this.fetch();
        return true;
    },

    cd: function(dir){
        if (dir == this.dir) return false;
        this.dir = dir;
        this.fetch();
        return true;
    }

});

/*
 * COLLECTIONS : Tags
 */

var Tags = Backbone.Collection.extend({

    model : Tag,
    url: '/tags',

    /*
     * Returns 'semantic' & 'treeview' tags,
     * assuming they are given mixed up in an array
     * & treeview tags start with the regular '::' separator
     */
    getTagsByType : function(tags){
        var semanticTags = [];
        var treeviewTags = [];
        _.each(tags, function(tag){
            if(tag.indexOf("::") == 0) {
                treeviewTags.push(tag);
            }
            else {
                semanticTags.push(tag);
            }
        });
        return {'treeview': treeviewTags, 'semantic': semanticTags }
    }



});

/* VIEWS */

/* Existing views so far :
 *
 * *  DocumentsView
 * *  (single) DocumentView
 * *  (single) DocumentEditView
 * *  TagsView
 * *  (single) TagView
 *
 */

// helpers:

/*
 * Date formatter
 *
 * TODO : use https://github.com/timrwood/underscore.date instead ? DateJs instead ?
 */
var formattedDate = function(v){
    v = v || null;
    var formatted = v; // preserve even false value to be deleted
    if(!isNaN(Date.parse(v))){
        var dt = new Date(v);
        var day = dt.getDate();
        var month = "" + (dt.getMonth()+1);
        var hours = "" + (dt.getHours()+1);
        var minutes = "" + (dt.getMinutes()+1);
        var seconds = "" + (dt.getSeconds()+1);
        formatted = (day < 10 ) ? "0" + day : day;
        formatted += "/";
        formatted += (month < 10 ) ? "0" + month : month;
        formatted += "/" + dt.getFullYear();
        formatted += " &agrave; ";
        formatted += (hours < 10 ) ? "0" + hours : hours;
        formatted += ":";
        formatted += (minutes < 10 ) ? "0" + minutes : minutes;
        formatted += ":";
        formatted += (seconds < 10 ) ? "0" + seconds : seconds;
    }
    return formatted;
}



var hideViews = function(){
    $('#list').hide();
    $('#item').hide();
};

var emptyViews = function(){
    $('#list').empty();
    $('#item').empty();
};


// Autocompletion helpers :
function splitByComma( val ) {
    return val.split( /,\s*/ );
}
function extractLast( term ) {
    return splitByComma( term ).pop();
}

/*
 * DocumentEditView
 */

var DocumentEditView = Backbone.View.extend({

    tagName: 'div',
    form: null,

    events: {
        'submit form': 'submit',
        'click input[type=reset]': 'cancel',
        'click button': 'delete'
    },

   initialize: function(){
       _.bindAll(this, 'render', 'cancel', 'submit', 'delete');
   },

   render: function(){
        app_router.navigate('documents/' + this.model.attributes.slug);
        // backbone-form :
        form = new Backbone.Form({ model: this.model });
        var buttons = '<input type="submit" value="Enregistrer" title="Enregistrer vos modifications" />';
        buttons += '&nbsp;<input type="reset" value="Annuler" title="Annuler vos modifications et retourner à la liste" />';
        $(this.el).empty().append($('<form>').append(form.render().el).append(buttons));
        $(this.el).append("<em>Dernière modification : " + formattedDate(this.model.attributes.updated_at) +  "</em>");


        // Seperating semantic & treeview tags from the initial tags value
        var tags = $('#tags', form.el).val().split(',');
        $('#tags', form.el).val(''); // resetting the form field value
        tagColl = new Tags();
        tagList = tagColl.getTagsByType(tags);
        $('#tags', form.el).val(tagList.semantic.join(', ')); // the semantic ones

        // --- AUTOCOMPLETION :
        $('#tags', form.el)
			// don't navigate away from the field on tab when selecting an item
			.bind( "keydown", function( event ) {
				if ( event.keyCode === $.ui.keyCode.TAB &&
						$( this ).data( "autocomplete" ).menu.active ) {
					event.preventDefault();
				}
			})
			.autocomplete({
				source: function( request, response ) {
					$.getJSON( "/tags/starting/" + extractLast(request.term), {
					}, response );
				},
				search: function() {
					// custom minLength
					var term = extractLast( this.value );
					if ( term.length < 1 ) {
						return false;
					}
					console.log('searching');
				},
				focus: function() {
					// prevent value inserted on focus
					return false;
				},
				select: function( event, ui ) {
					var terms = splitByComma( this.value );
					// remove the current input
					terms.pop();
					// add the selected item
					terms.push( ui.item.value );
					// add placeholder to get the comma-and-space at the end
					terms.push( "" );
					this.value = terms.join( ", " );
					console.log('select ended');
					return false;
				}
			});
			// --- / AUTOCOMPLETION

        this.renderLocations(tagList.treeview);

        return this;
    },

    /*
     * build the locations list,
     * @param tags : a treeview tags list
     */
    renderLocations : function(tags) {
        if(tags.length){
            var label = '<p>Emplacements&nbsp;:</p>';
            var hidden = '<input type="hidden" name="treeList" id="treeList" value="' + tags + '" />';
            $(this.el).append('<div class="locations"><ul>');
            var list = '';
            _.each(tags, function(tagLabel){
                list += '<li><a href="/#tags/' + tagLabel + '">' + tagLabel.split('::').join('/') + '</a></li>';
            });
            // we also conserve a flat list of all locations, cf. submit()
            $('.locations ul',$(this.el)).before(label).append(list).append(hidden);
        }
    },

    cancel: function(){
        docsView.backToTheList();
    },

    submit: function(e){
        e.preventDefault();
        var self = this;
        var errors = form.commit();
        if(null == errors){
            var result = this.model.save(form.model,{
                success:function(model, resp){
                    //new App.Views.Notice({ message: msg });
                    self.notify('Données enregistrées', 'confirm', docsView.backToTheList);
                },
                error:function(){
                    self.notify('Erreur de connexion distante : Le serveur ne peut pas enregistrer vos modifications.', 'alert');
                    //new App.Views.Error();
                }
            });
        } else{
            self.notify("Veuillez vérifier les champs du formulaire : " + errors, 'error');
        }
    },

    notify: function(msg, type, callback){
        type = type || 'confirm';
        $('form output', this.el).remove();
        $('form', this.el).append('<output class="'+ type +'">' + msg + '<output>');
        if(callback){ callback();}
    },

    delete: function(e){
        e.preventDefault();
        if (window.confirm('Are u sure ?')) this.model.destroy();
    }

});

/*
 * DocumentView
 */

var DocumentView = Backbone.View.extend({

    tagName: 'li',

    events: {
        //'click .delete': 'delete'
        'click': 'edit',
    },

    initialize: function(){
        //_.bindAll(this, 'render', 'delete');

        _.bindAll(this, 'render');
        //this.model.bind('destroy', this.remove); // ? A tester si ça marche vraiment : suppression dans la liste si supp dans modèle
        //this.model.bind('destroy', this.remove); // ? A tester si ça marche vraiment : suppression dans la liste si supp dans modèle
        this.model.bind('change', this.render);
    },

    render: function(){
        //$(this.el).html('<span>'+this.model.get('title')+'</span><button class="delete">delete</button>');
        var msg = "Consulter le détail de ce document";
        $(this.el).attr('title', msg);
        $(this.el).text(this.model.get('title'));
        return this;
    },

    edit: function(){
        hideViews();
        var documentEditView = new DocumentEditView({
            model: this.model
        });
        $('#item').empty().show().append(documentEditView.render().el).show();
    }

});

/*
 * TagView
 *
 * 2 types of tags :
 * * treeview tags (starting with '::')
 * * semantic tags
 *
 * render() manage the left-side tag display, see TagsView
 *
 */

var TagView = Backbone.View.extend({

    tagName: 'li',
    is_dir: false,

    events: {
        'click': 'select'
    },

    initialize: function(){
        _.bindAll(this, 'select');
    },

    render: function(){
    if(undefined != this.model){
        var label = this.model.get('label');
        var span = '<span/>';

        // every "dir" tag (= treeview tags) label starts with '::'
        if (label.indexOf('::') == 0){
            label = label.substr(label.lastIndexOf('::') + 2);
            span = '';
            $(this.el).addClass('dir');
            this.is_dir = true;
        } else {
            $(this.el).addClass('btn').addClass('small');
        }

        $(this.el).html(span + label);
        return this;
    } else {
            console.log('@FIXME : undefined model : ');
            console.log(this);
            return "n-a";
        };
    },

    select: function(evt){
        evt.stopPropagation();

        $('#item').empty();
        $('#item').hide();
        $('#list').show();

        if (!this.is_dir) docsView.addTag(this.model.get('label'));
        else docsView.cd(this.model.get('label'));
    },

});

/*
 * DocumentsView
 */

var DocumentsView = Backbone.View.extend({

    el: $('#list'),

    events: {
        'click .tags li': 'removeTag'
    },

    initialize: function(){
        _.bindAll(this, 'render', 'append', 'appendAll');
        this.collection.bind('reset', this.appendAll);
        this.collection.fetch();
    },

    render: function(){
        //app_router.navigate('documents/');
//        resetViews();

        $(this.el).empty().show();
        $(this.el).append('Vous êtes ici : <nav><ul></ul></nav>')
        $(this.el).append('<ul class="tags"></ul><hr>');
        $(this.el).append('<ul class="documents"></ul>');
        $(this.el).show();
        return this;
    },

    append: function(doc){
        var documentView = new DocumentView({
            model: doc
        });
        $('ul.documents', this.el).append(documentView.render().el);
    },

    appendAll: function(){
        $('ul.documents', this.el).empty();
        this.collection.each(this.append);
    },

    removeTag: function(e){
        e = $(e.currentTarget);
        if (this.collection.removeTag(e.text())){
            app_router.navigate(this.collection.genUrl());
            e.remove();
        }
        this.setTagSelectionLabel();
    },

    addTag: function(tag){
        if (this.collection.addTag(tag.trim())){
            //this.appendAll();
            $('ul.tags', this.el).empty();
            $('#tagsSelectionLabel').remove();
            _.each(this.collection.tags, function(t){
                var msg = "Retirer ce tag de votre sélection";
                $('ul.tags', this.el).append('<li title="' + msg + '"><span/>' + t + '</li>');
            });
            this.setTagSelectionLabel();
        }
        app_router.navigate(this.collection.genUrl());
    },

    setTagSelectionLabel : function(){
        $('#tagsSelectionLabel').remove();
        if($('ul.tags').children().length){
            $('ul.tags').before('<span id="tagsSelectionLabel">Votre sélection :</span>');
        }
    },

    setTags: function(tags){
        tags = _.reject(_.uniq(_.isArray(tags) ? tags : tags.split('&')), function(tag){ return !tag; });
        if (_.isEmpty(tags)) return false;
        var self = this;
        _.each(tags, function(tag){
            if(tag.indexOf("::") == 0) self.cd(tag);
            else self.addTag(tag);
        });
    },

    cd: function(dir){
        if (this.collection.cd(dir.trim())){
            // maj affichage du rép
            var self = this;
            dir = dir.substr(2).split('::');
            $('nav ul', self.el).empty();
            dir.forEach(function(e){
                $('nav ul', self.el).append('<li>' + e + '</li>');
            });
        }
        app_router.navigate(this.collection.genUrl()); //'tags/' + this.collection.tags.join('&'));
    },

    refresh: function(){
        this.collection.fetch();
    },

    /*
     * Manage the "Get back to documents list" scenario
     */
    backToTheList: function(){
        app_router.navigate('documents/');
        // refreshing tag list
        var tagsView = new TagsView({
            collection: new Tags()
        });
        tagsView.render();
        //app_router.navigate(this.collection.genUrl());
        hideViews();
        $('#item').empty();
        $('#list').show();
    }

});

/*
 * TagsView
 *
 * Manage the left-side tag list
 */

var TagsView = Backbone.View.extend({

    el: $('#tags'),
    flat_tree: {},

    initialize: function(){
        _.bindAll(this, 'render', 'append', 'appendAll');
        this.collection.bind('reset', this.appendAll);
        this.collection.fetch();
    },

    render: function(){
        $(this.el).empty().show();
        $(this.el).append('<div class="tree"></div>');
        $(this.el).append('<div class="semantics"><input type="text" /><br />Tags :<ul></ul></div>');
        return this;
    },

    append: function(tag){
        if(tag.get('label').indexOf("::") == 0){
            this.flat_tree[tag.get('label')] = tag;
        } else {
            var tagView = new TagView({ model: tag });
            $('div.semantics ul', this.el).append(tagView.render().el);
        }

    },

    toul: function(obj){
        var ul = $('<ul>');
        var self = this;
        var parent_fullid = (arguments[1] || '');
        _.each(obj, function(e, i){
            var lifullid = parent_fullid + '::' + i;
            var tagView = new TagView({ model: self.flat_tree[lifullid] });
            var li = $(tagView.render().el);
            if (e && !_.isEmpty(e)) li.append(self.toul(e, lifullid));
            ul.append(li);
        });
        return ul;
    },

    appendAll: function(){
        $('ul', this.el).empty();
        this.flat_tree = {};
        this.collection.each(this.append);

        var tree = {};

        _.each(this.flat_tree, function(tag, label){
            var list = label.substr(2).split('::');
            var res = temp = {};
            var fullname = '';
            list.reverse().forEach(function(f){ res = {}; res[f] = temp; temp = res; });
            $.extend(true, tree, res); // recursive extend
        });

        var sidetreecontrol = $('<div>').attr('id', 'sidetreecontrol').append('<a href="#">Réduire</a> | <a href="#">Développer</a>');

        $('div.tree', this.el).append(sidetreecontrol);
        $('div.tree', this.el).append(this.toul(tree)).treeview({
            'collapsed': true,
            'control':'#sidetreecontrol'
        });

    },

});

/*
 * Initial views rendering
 */


var docsView = new DocumentsView({
    collection: new Documents()
});
docsView.render();

var tagsView = new TagsView({
    collection: new Tags()
});
tagsView.render();



/* ROUTING */
var AppRouter = Backbone.Router.extend({

    routes: {
        "tags/:tags": "tags", // #tags/montag
        //"*search": "search"
    },

    tags: function(tags){
        docsView.setTags(tags);
    },
/*
    search: function(search){
        //docsView.search();
    }
*/
});
var app_router = new AppRouter;
Backbone.history.start(); // a priori obligatoire pour le routing ???

// A mettre dans view + model tags
$('#tags li').click(function(evt){
    evt.preventDefault();
    docsView.addTag($(this).text());
})

// DnD Upload
var filecount = 0;
$('#dropArea').bind('dragover', function(evt){
    evt.preventDefault();     // Pourquoi ? je sais pas mais nécessaire d'avoir défini dragover pour que drop marche
    $(this).addClass('on');
}).bind('drop', function(evt){
    evt.preventDefault();

    $(this).removeClass('on');
    $(this).prepend('<img style="position:absolute;top:0;left:0;" src="/images/loading.gif" />');

    files = evt.originalEvent.dataTransfer.files;
    filecount = files.length;
    _.each(files, function(file){

    //    if (file.size < 5*1024*1024){
            var formData = new FormData();
            formData.append('resource', file);
            if (tags = docsView.collection.tags.join(',')) formData.append('tags', tags);

            xhr = new XMLHttpRequest();

            xhr.addEventListener("load", transferComplete, false);

            xhr.open("POST", "/");
            xhr.send(formData);
    //    }

    });

}).bind('dragleave', function(evt){
    evt.preventDefault();
    $(this).removeClass('on');
});

transferComplete = function(evt){
    // append ?
    docsView.refresh();
    if (0 == --filecount){
        $('#dropArea img').remove();
    }
};



});
