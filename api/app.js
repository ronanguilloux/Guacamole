/*!
 * Guacamole.js
 * Copyright (c) 2011 Toog <contact@toog.fr>
 * MIT Licensed
 */

/**
 * Accepted client.s
 */

var acceptedClients = 'http://localhost:4000/';
//acceptedClients = '*';
var crossSitesPolicy = {'Content-Type': 'text/plain, application/json','Access-Control-Allow-Origin' : acceptedClients};

/**
 * Library version.
 */

exports.version = '0.0.1';

/**
 * Module dependencies.
 */

var port = 3000,
    express = require('express'),
    mongoose = require('mongoose'),
    models = require('./models'),
    form = require('connect-form'),
    _ = require('underscore');
    //db,
    //Document;
    //Tag;


var db, Document, Tag;

var app = module.exports = express.createServer(
    form({
        keepExtensions: true,
        uploadDir: './uploads'
    })
);


/*
 * Configuration
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

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

models.defineModels(mongoose, function(){
    app.Document = Document = mongoose.model('Document');
    app.Tag = Tag = mongoose.model('Tag');
    db = mongoose.connect('mongodb://localhost/docs');
});


/*
 * GET = Read using id, responds back with {object}
 * POST = Create, responds back with {object}
 * PUT = Update using id, responds back with {object}
 * DEL = Delete using id, responds back with boolean
 */


app.get('/', function(req, res){
    res.send({
        "The amazing Guacamole API REST server !": {
            "Available requests URI": [
                "/documents",
                "/tags"
            ],
            "Available HTTP verbs": [
                "GET",
                "POST",
                "PUT",
                "DEL"
            ]
        }
    });
});



app.post('/', function(req, res){

    req.form.complete(function(err, fields, files){

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

// DOCUMENT Routes

/*
 * GET documents
 *
 * @param (request) req
 * @param (response) res
 * @return (JSON)
 * @api public
 */
app.get('/documents', function(req, res, crossSitePolicy){

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
        res.send(docs, crossSitePolicy);
    });

});


/*
 * GET documents/:slug
 */
app.get('/documents/:slug', function(req, res, crossSitePolicy){

    Document.findOne({ slug: req.params.slug }, function(err, doc){
        if (!doc) return res.send({error:'Document not found'}); // TODO 404
        res.send(doc, crossSitePolicy);
    });

});

/*
 * POST documents
 */
app.post('/documents', function(req, res, crossSitePolicy){

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
                res.send(doc, crossSitePolicy);
                if (err) console.log(err);
            });
        } else {
            res.send({}, crossSitePolicy); // TODO 500
        }
    });

});

/*
 * DEL documents
 */
app.del('/documents/:id', function(req, res, crossSitePolicy){

    Document.findOne({ _id: req.params.id }, function(err, doc){
        if (!doc) return res.send({error:'Document not found'}); // TODO 404
        doc.remove(function(){
            res.send({}, crossSitePolicy);
        });
    });

});

/*
 * PUT documents
 */
app.put('/documents/:id', function(req, res, crossSitePolicy){

    // todo : gérer pièce jointe
    // todo : si pj, recalculer thumbnail

    Document.findOne({ _id: req.params.id }, function(err, doc){
        doc.set(req.body);
        doc.save(function(err){
            if (!err) return res.send(doc, crossSitePolicy);
            return res.send(err, crossSitePolicy);
        });
    });

});

/*
Ajouter les actions suivantes :
- modification de masse (sur selection de documents) : sur liste
- suppression masse : sur liste
- update thumb : forcer recalcul de la thumbnail
*/


// TAGS

app.get('/tags', function(req, res, crossSitePolicy){

    Tag.find().sort('label', 'ascending').execFind(function (err, tags) {
        res.send(tags, crossSitePolicy);
    });

});

app.get('/tags?:type', function(req, res, crossSitePolicy){

    Tag.find().sort('label', 'ascending').execFind(function (err, tags) {
        res.send(tags, crossSitePolicy);
    });

});

app.post('/tags', function(req, res, crossSitePolicy){
    // TODO
});

app.put('/tags/:id', function(req, res, crossSitePolicy){
    // TODO
});

app.del('/tags/:id', function(req, res, crossSitePolicy){
    // TODO
    // Interdire si documents ou forcer ?
});

app.listen(port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
