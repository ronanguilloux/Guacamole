
/**
 * Module dependencies.
 */

var express = require('express')
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
        // Imagick pour node https://github.com/rsms/node-imagemagick
        uploadDir: './uploads'
    })
);

// Configuration

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

// HELPERS


// Routes

app.get('/', function(req, res){
    res.render('index.jade', { title: 'Docs' });
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

app.get('/documents', function(req, res){

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
    Document.find(query, function (err, docs){
        res.send(docs);
    });

});

app.get('/documents/:slug', function(req, res){

    Document.findOne({ slug: req.params.slug }, function(err, doc){
        if (!doc) return res.send({error:'Document not found'}); // TODO 404
        res.send(doc);
    });

});

app.post('/documents', function(req, res){

    req.form.complete(function(err, fields, files){
        if (!err && files.resource){
            var doc = new Document(_.extend(fields, {
                resource: {
                    name: files.resource.filename,
                    file: files.resource.path
                }
            }));
            doc.save(function(err){
                res.send(doc);
                if (err) console.log(err);
            });
        } else {
            res.send({}); // TODO 500
        }
    });

});

app.del('/documents/:id', function(req, res){

    Document.findOne({ _id: req.params.id }, function(err, doc){
        if (!doc) return res.send({error:'Document not found'}); // TODO 404
        doc.remove(function(){
            res.send({});
        });
    });

});

app.update('/documents/:id', function(req, res){
    // MAJ
});

// TAGS

app.get('/tags', function(req, res){

    Tag.find().sort('label', 'ascending').execFind(function (err, tags) {
        res.send(tags);
    });

});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);