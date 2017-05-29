var Path = require('path');
var Fs = require('fs');
var Backend = require('./rawbackend.js');

class B2 {
	constructor(user, password) {
		this.auth = {'user': user, 'password': password};
	}
	
	init(callback) {		
		Backend.authorizeAccount(this.auth, (err, settings) => {
			if (err) return callback(err);

			Backend.listBuckets(settings, (err, data) => {
				if (err) return callback(err);
				if (data.buckets.length == 0) return callback(new Error(404, 'No buckets in B2 account!'));

				callback(null, {buckets:data.buckets, settings:settings});
			});
		});
	}
	
	uploadFile(options, callback) {
		if (!options instanceof Object) 
			throw new Error(500, '<options> needs to ba an object: {*file:Buffer, bucket:String, name:String}');
		if (!callback || !callback instanceof Function) 
			throw new Error(500, 'No callback was passed');
		if (!options.file || !options.file instanceof Buffer) 
			throw new Error(500, '<options.file> needs to be a buffer!');
		if (options.name && !options.name instanceof String)
			throw new Error(500, '<options.name> must be a string!');
		if (options.bucket && !options.bucket) 
			throw new Error(404, '<options.bucket> must be a bucketId or the name of a bucket!');
		
		this.init((err, context) => {
			if (err) return callback(err);
			
			let bucket = context.buckets[0];
			if (options.bucket) {
				bucket = context.buckets.find(r => r.bucketName == options.bucket);
				if (!bucket) throw new Error(404, `Bucket with name "${options.bucket}" could not be found`);
			}

			Fs.readFile(options.file, (err, fileBuffer) => {
				if (err) return callback(err);
				
				Backend.getUploadUrl(context.settings, bucket.bucketId, (err, uploadUrl) => {
					if (err) return callback(err);
					
					var fileName = options.name || Path.basename(options.file);
					Backend.uploadFile(uploadUrl, fileBuffer, fileName, (err, res) => {
						if (err) return callback(err);
						callback(null, `${context.settings.downloadUrl}/file/${bucket.bucketName}/${res.fileName}`);
					});
				});
			});
		});
	}
}

module.exports = B2;