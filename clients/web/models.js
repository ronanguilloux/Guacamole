function define(mongoose, fn){

    /*
     * Vars
     */

    var Schema = mongoose.Schema,
        ObjectId = Schema.ObjectId;

    /*
     * Schemas : Document
     */

    Document_Schema = new Schema({
        'slug': { type: String, index: { unique: true }, set: function(v){
            return slugify(v);
        }},
        'title': { type: String, set: function(v){
            if (v == '') v = this.title;
            if (!this.slug) this.slug = v;
            return v;
        }},
        'description': String,
        'resource': { type: { name: String, file: String }, set: function(v){
            if (!this.title) this.title = v.name;
            return v;
        }},
        'tags': { type: [String], set: function(v){
            var tags = v;
            if (v.length == 1) tags = _.invoke(v[0].split(','), function() { return tagify(this); });
            tags = _.uniq(tags);
            // Save new tags
            tags.forEach(function(tag_label){
                if(tag_label.trim()){
                    Tag.findOne({ label: tag_label }, function(err, tag){
                        if (!tag){
                            tag = new Tag({label: tag_label});
                            tag.save();
                        }
                    });
                }
            });

            return tags;
        }},
        'status': Number, // 0 or undefined = exist, 1 = deleted
        'created_at': { type: Date, default: Date.now, set: function(v){
            if (!this.created_at) return Date.now();
            return this.created_at;
        }},
        'updated_at': { type: Date, default: Date.now }
    }).pre('save', function (next){ // A tester
        console.log(new Date)
        if (!this.created_at){
            this.created_at = this.updated_at = new Date;
        } else {
            this.updated_at = new Date;
        }
        next();
    });

    // @TODO : A mettre dans une lib
    var slugify = function(s){
        return s.replace(/\s+/ig, '_').replace(/[^a-zA-Z0-9_]+/ig, '').toLowerCase(); // TODO garder les accents (à trans en non accent)
    };

    // @TODO : A mettre dans une lib
    var tagify = function(s){
        // caractères interdits : /&,
        return s.replace(/([\/&,]|::)+/ig, '').trim();
    };

    /*
     * Schemas : Tag
     */

    Tag_Schema = new Schema({
        'label': { type: String, index: { unique: true }, set: function(v){
            return tagify(v);
        }}
    });

    var Document = mongoose.model('Document', Document_Schema);

    /*
     * Document.prototype.save - redefinition
     */

    Document.prototype._save = Document.prototype.save;
    Document.prototype.save = function(fn){
        var self = this;
        self._save(function(err){
            if (!err) fn(err);
            else if (err.message.indexOf('E11000') == 0){ // Sans doute prévoir un meilleur test (quid si autre champ unique ?)
                // calcul du nouveau slug
                var slug = self.slug.split('-');
                var i = (slug.length > 1) ? slug.pop() : 0;
                self.setValue('slug', slug.join('-') + '-' + (i*1+1));
                self.isNew = true;
                self.save(fn);
            } else {
                throw new Error(err.message)
            }
        });
    };

    var Tag = mongoose.model('Tag', Tag_Schema);

    // Launch callback
    fn();

};

exports.define = define;
