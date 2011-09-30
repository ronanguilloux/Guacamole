jQuery(function($){

Backbone.emulateHTTP = true;

/* MODEL */

var Tag = Backbone.Model.extend({

    urlRoot: '/tags',

    url : function(){
        var base = this.urlRoot || urlError();
        if (this.isNew()) return base;
        return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    initialize: function(){
        this.id = this.get('_id') || null;
    }


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

    schema: {
        title: { type: 'Text' },
        description: { type: 'TextArea' }
    },

    getForm: function(){
        return {
            id: 'form_document_' + this.id,
            elements:[{
                name: 'title',
                caption: 'Title',
                type: 'text',
                wrapper: 'p',
                value: this.get('title')
            },{
                name: 'description',
                caption: 'Description',
                type: 'textarea',
                cols: 50,
                rows: 5,
                wrapper: 'p',
                value: this.get('description')
                //value: this.get('email')
            },{
                name: 'bla',
                caption: 'Bla',
                type: 'text',
                wrapper: 'p',
                //value: this.get('email')
            },{
                type: 'reset',
                value: 'Cancel',
                wrapper: 'p'
            },{
                type: 'button',
                html: 'Delete',
                wrapper: 'p'
            },{
                type: 'submit',
                value: 'Save',
                wrapper: 'p'
            }]
        };
    }

});

/* COLLECTIONS */

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

var Tags = Backbone.Collection.extend({

    model : Tag,
    url: '/tags'

});

/* VIEWS */

var DocumentEditView = Backbone.View.extend({

    tagName: 'div',

    events: {
        'click input[type=submit]': 'submit',
        'click input[type=reset]': 'cancel',
        'click button': 'delete'
    },

   initialize: function(){
       _.bindAll(this, 'render', 'cancel', 'submit', 'delete');
   },

   render: function(){
        $(this.el).buildForm(this.model.getForm());
        return this;
    },

    cancel: function(){
        $('#document').empty().hide();
        $('#documents').show();
    },

    submit: function(e){
        e.preventDefault();
        console.log($('form', this.el).serializeObject());
        this.model.save($('form', this.el).serializeObject());
        //this.model.save();
    },

    delete: function(e){
        e.preventDefault();
        if (window.confirm('Are u sure ?')) this.model.destroy();
    }

});

var DocumentView = Backbone.View.extend({

    tagName: 'li',

    events: {
        //'click .delete': 'delete'
        'click': 'edit',
    },

    initialize: function(){
        //_.bindAll(this, 'render', 'delete');
        _.bindAll(this, 'render');
        //this.model.bind('destroy', this.remove); // ? A tester si ça marche vraiment : suppression dans la liste si supp dans modèle        this.model.bind('destroy', this.remove); // ? A tester si ça marche vraiment : suppression dans la liste si supp dans modèle
        this.model.bind('change', this.render);
    },

    render: function(){
        //$(this.el).html('<span>'+this.model.get('title')+'</span><button class="delete">delete</button>');
        $(this.el).text(this.model.get('title'));
        return this;
    },

    edit: function(){
        var documentEditView = new DocumentEditView({
            model: this.model
        });
        $('#documents').hide();
        $('#document').empty().append(documentEditView.render().el).show();
    }

});

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
        var label = this.model.get('label');
        var span = '<span/>';

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
    },

    select: function(evt){
        evt.stopPropagation();
        if (!this.is_dir) docsView.addTag(this.model.get('label'));
        else docsView.cd(this.model.get('label'));
    },

});

var DocumentsView = Backbone.View.extend({

    el: $('#documents'),

    events: {
        'click .tags li': 'removeTag'
    },

    initialize: function(){
        _.bindAll(this, 'render', 'append', 'appendAll');
        this.collection.bind('reset', this.appendAll);
        this.collection.fetch();
    },

    render: function(){
        $(this.el).append('<nav><ul></ul></nav>')
        $(this.el).append('<ul class="tags"></ul><hr>')
        $(this.el).append('<ul class="documents"></ul>');
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
    },

    addTag: function(tag){
        if (this.collection.addTag(tag.trim())){
            //this.appendAll();
            $('ul.tags', this.el).empty();
            _.each(this.collection.tags, function(t){
                $('ul.tags', this.el).append('<li><span/>' + t + '</li>');
            });
        }
        app_router.navigate(this.collection.genUrl());
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
    }

});

var TagsView = Backbone.View.extend({

    el: $('#tags'),
    flat_tree: {},

    initialize: function(){
        _.bindAll(this, 'render', 'append', 'appendAll');
        this.collection.bind('reset', this.appendAll);
        this.collection.fetch();
    },

    render: function(){
        $(this.el).append('<div class="tree"></div>');
        $(this.el).append('<div class="semantics"><input type="text" /><ul></ul></div>');
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

        $('div.tree', this.el).append(this.toul(tree)).treeview({
            'collapsed': true,
        });

    },

});


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