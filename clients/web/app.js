/**
 * Guacamole.js
 * Copyright (c) 2011 Toog <contact@toog.fr>
 * MIT Licensed
 */

/**
 * HTTP port
 */

var port = 4000;

/**
 * Library version
 */

exports.version = '0.0.1';

/**
 * Module dependencies
 */

var express = require('express')
    mongoose = require('mongoose'),
    models = require('./models'),
    form = require('connect-form'),
    _ = require('underscore');

/**
 * Vars
 */

var db, headers, Document, Tag;

/**
 * Server instance
 */
var app = module.exports = express.createServer(
    form({
        keepExtensions: true,
        uploadDir: './uploads'
    })
);



/**
 * Server configuration
 */

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');

    app.use(express.compiler({ src: __dirname + '/public', enable: ['less']}));

    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

/**
 * Environment configuration
 */

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

/**
 * Model definition, using mongoose
 */

models.define(mongoose, function(){
    app.Document = Document = mongoose.model('Document');
    app.Tag = Tag = mongoose.model('Tag');
    db = mongoose.connect('mongodb://localhost/docs');
});


app.get('/', function(req, res){
    res.render('index.jade', { title: 'Docs' });
});

app.post('/', function(req, res){

    req.form.complete(function(err, fields, files) {

        if (!err && files.resource){
            var doc = new Document(_.extend(fields, {
                resource: {
                    name: files.resource.filename,
                    file: files.resource.path
                }
            }));
            doc.save(function(err){
                if (!err) json = {'success': true, 'document': doc};
                else json = {'success': false, 'error': err};
                res.send(json);
            });
        } else {
            res.send({'success': false, 'error': err}); // TODO 500
        }
    });

});

/**
 * DOCUMENT Routes
 */

/**
 * GET documents
 *
 * @param Object req : request
 * @param Object res : response
 * @return Json tags
 * @api public
 */

app.get('/documents', function(req, res, headers){

    var query = {};
    var tags;

    if (tags = req.query.tags){
        tags = _.isArray(tags) ? tags : tags.split(',');
        query = {
            // crado en attendant le $and de mongo 1.9.1
            // ou alors map / reduce ???
            $where: 'function(){ var ok = true; ["' + tags.join('","') + '"].forEach(function(e){ if (obj.tags.indexOf(e) == -1) ok = false; }); return ok; }'
        }
    }

    // LISTE et QUERY
    // limit, offset, filtres, sort, search
    Document.find(query, function (err, docs){
        res.send(docs);
    });

});

/**
 * GET documents/:slug
 */

app.get('/documents/:slug', function(req, res, headers){

    Document.findOne({ slug: req.params.slug }, function(err, doc){
        if (!doc) return res.send({error:'Document not found'}); // TODO 404
        res.send(doc, headers);
    });

});

/**
 * POST documents (create)
 */

app.post('/documents', function(req, res, headers){

    // création thumbnail

    req.form.complete(function(err, fields, files){
        if (!err && files.resource){
            var doc = new Document(_.extend(fields, {
                resource: {
                    name: files.resource.filename,
                    file: files.resource.path
                }
            }));
            doc.save(function(err){
                res.send(doc, headers);
                if (err) console.log(err);
            });
        } else {
            res.send({}, headers); // TODO 500
        }
    });

});

/**
 * DELETE documents
 */

app.del('/documents/:id', function(req, res, headers){

    Document.findOne({ _id: req.params.id }, function(err, doc){
        if (!doc) return res.send({error:'Document not found'}); // TODO 404
        doc.remove(function(){
            res.send({}, headers);
        });
    });

});

/**
 * PUT documents (update)
 */

app.put('/documents/:id', function(req, res, headers){

    // todo : gérer pièce jointe
    // todo : si pj, recalculer thumbnail

    Document.findOne({ _id: req.params.id }, function(err, doc){
        doc.set(req.body);
        doc.save(function(err){
            if (!err) return res.send(doc, headers);
            return res.send(err, headers);
        });
    });

});

/**
 * TODO :
 * Ajouter les actions suivantes :
 * - modification de masse (sur selection de documents) : sur liste
 * - suppression masse : sur liste
 * - update thumb : forcer recalcul de la thumbnail
 */

/**
 * GET /tags : all tags
 */

app.get('/tags', function(req, res, headers){
    Tag.find().sort('label', 'ascending').execFind(function (err, tags) {
        res.send(tags, headers);
    });
});

/**
 * GET /tags/semantic : all *semantic* tags
 */

app.get('/tags/semantic', function(req, res, headers){
    Tag.find({label:/^[^'::']/}).sort('label', 'ascending').execFind(function (err, tags) {
        res.send(tags, headers);
    });
});

/**
 * GET /tags/treeview : all *treeview* tags
 * = the ones that start with '::'
 */

app.get('/tags/treeview', function(req, res){
    Tag.find({label:/^['::']/}).sort('label', 'ascending').execFind(function (err, tags) {
        res.send(tags);
    });
});

/**
 * GET /tags/starting/:str : all tag labels starting by ':str'
 */

app.get('/tags/starting/:str', function(req, res, headers){
	var result = [];
	// unwanted requests give all semantic tags
    if (req.params.str.indexOf(':') == 0){
        // Every unawted search returns all semantic tags
        Tag.find({label:/^[^'::']/}).sort('label', 'ascending').execFind(function (err, tags) {
            res.send(tags, headers);
        });
    } else {
        var str = req.params.str;
        var regular = new RegExp("^" + str);
        Tag.find({label:regular}).sort('label', 'ascending').execFind(function (err, tags) {
           if(0 == tags.length){
               res.send(204);
               // res.writeHead(204);
               //res.end();
           } else {
               res.send(tags, headers);
           }
        });
    }

});


app.post('/tags', function(req, res, headers){
    // TODO
});

app.put('/tags/:id', function(req, res, headers){
    // TODO
});

app.del('/tags/:id', function(req, res, headers){
    // TODO
    // Interdire si documents ou forcer ?
});


/**
 * Introspection-based documentation
 * using app.routes.routes properties
 */
app.get('/documentation', function(req, res, headers){
    var routesDoc = [];
    var fillRoutesDoc = function(element, index, array){
        routesDoc.push(element.method.toUpperCase() + ' ' + element.path);
        // @TODO : prototype routes objt adding a getDocumentation method that fetch the documentation var of each route
    };
    app.routes.routes.get.forEach(fillRoutesDoc);
    app.routes.routes.put.forEach(fillRoutesDoc);
    app.routes.routes.post.forEach(fillRoutesDoc);
    app.routes.routes.delete.forEach(fillRoutesDoc);

    res.send({
        "Guacamole API REST server documentation": {
            "Available requests URI": routesDoc,
        }
    }, headers);
});


app.listen(port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
