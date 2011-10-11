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
 *
 * @param {Object} longoose
 * @param {Function} callback
 */

models.define(mongoose, function(){
    app.Document = Document = mongoose.model('Document');
    app.Tag = Tag = mongoose.model('Tag');
    db = mongoose.connect('mongodb://localhost/docs');
});

/**
 * Error handler
 * log errors & send a (503 by default) status code with error message
 *
 * @param {ServerResponse} response
 * @param {Mixed} error
 * @param {Integer} HTTP status code
 * @return {ServerResponse}
 */

var handleError = function(res, err, status){
    status = status || 503; // Service Unavailable
    err = err || status;
    console.log({'status': status, 'error': err});
    return res.send(status, {error: err});
}


app.get('/', function(req, res){
    res.render('index.jade', { title: 'Docs' });
});

app.post('/', function(req, res){

    req.form.complete(function(err, fields, files) {
        if (err) return handleError(res, err);
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
 * DOCUMENT Routes :
 */

/**
 * GET documents
 *
 * @param {Object} request
 * @param {Object} response
 * @param {Object} headers
 * @return {Json} documents list
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
        if (err) return handleError(res, err);
        res.send(docs);
    });

});

/**
 * GET documents/:slug
 *
 * @param {Object} request
 * @param {Object} response
 * @param {Object} headers
 * @return {Json} one document matching the slug parameter
 * @api public
 */

app.get('/documents/:slug', function(req, res, headers){
    Document.findOne({ slug: req.params.slug }, function(err, doc){
        if (err) return handleError(res, err);
        if (!doc) return res.send(404);
        res.send(doc, headers);
    });

});

/**
 * POST document, CREATE a document
 *
 * @param {Object} request
 * @param {Object} response
 * @param {Object} headers
 * @return {Json} the saved document
 * @api public
 */

app.post('/documents', function(req, res, headers){

    // création thumbnail

    req.form.complete(function(err, fields, files){
        if (err) return handleError(res, err);
        if (files.resource){
            var doc = new Document(_.extend(fields, {
                resource: {
                    name: files.resource.filename,
                    file: files.resource.path
                }
            }));
            doc.save(function(err){
                if (err) return handleError(res, err);
                return res.send(doc, headers);
            });
        }
        return handleError(res, {'message' : 'No files resources found'});
    });

});

/**
 * DELETE documents
 *
 * @param {Object} request
 * @param {Object} response
 * @param {Object} headers
 */

app.del('/documents/:id', function(req, res, headers){

    Document.findOne({ _id: req.params.id }, function(err, doc){
        if (err) return handleError(res, err);
        if (!doc) return res.send(404);
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
        if (err) return handleError(res, err);
        if (!doc) return res.send(404);
        doc.set(req.body);
        doc.save(function(err){
            if (err) return handleError(res, err);
            return res.send(doc, headers);
        });
    });

});

/* TODO :
 * Ajouter les actions suivantes :
 *   - modification de masse (sur selection de documents) : sur liste
 *   - suppression masse : sur liste
 *  - update thumb : forcer recalcul de la thumbnail
 */

/**
 * TAGS Routes :
 */

/**
 * GET /tags : all tags
 */

app.get('/tags', function(req, res, headers){

    Tag.find().sort('label', 'ascending').execFind(function (err, tags) {
        if (err) return handleError(res, err);
        res.send(tags, headers);
    });

});

/**
 * GET /tags/semantic : all *semantic* tags
 */

app.get('/tags/semantic', function(req, res, headers){

    Tag.find({label:/^[^'::']/}).sort('label', 'ascending').execFind(function (err, tags) {
        if (err) return handleError(res, err);
        res.send(tags, headers);
    });

});

/**
 * GET /tags/treeview : all *treeview* tags
 * = the ones that start with '::'
 */

app.get('/tags/treeview', function(req, res){

    Tag.find({label:/^['::']/}).sort('label', 'ascending').execFind(function (err, tags) {
        if (err) return handleError(res, err);
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
            if (err) return handleError(res, err);
            return res.send(tags, headers);
        });
    }

    var regular = new RegExp("^" + req.params.str);
    Tag.find({label:regular}).sort('label', 'ascending').execFind(function (err, tags) {
        if (err) return handleError(res, err);
        if(0 == tags.length){
            return res.send(204);
        }
        res.send(tags, headers);

    });

});


/**
 * POST tags (create)
 */

app.post('/tags', function(req, res, headers){

    // TODO
    res.writeHead(501, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'not implemented' }));

});

/**
 * PUT tags (update)
 */

app.put('/tags/:id', function(req, res, headers){

    // TODO
    res.writeHead(501, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'not implemented' }));

});

app.del('/tags/:id', function(req, res, headers){

    // TODO
    // Interdire si documents ou forcer ?
    res.writeHead(501, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'not implemented' }));

});

/**
 * Documentation :
 */

/**
 *
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
