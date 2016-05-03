/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const http = require('https');
const FormDataHandler = require('form-data');

exports = module.exports.postAttachmentFromStream = function (channel, config, stdout, callback) {
  var form = new FormDataHandler();
  var fileType = config.type || 'png';
  form.append('token', config.botToken);
  form.append('channels', channel[0]);
  form.append('file', stdout, {
    filename: config.commandName + '_graph.' + fileType,
    contentType: 'image/' + fileType,
    filetype: 'image/' + fileType
  });
  var options = {
    host: 'slack.com',
    path: '/api/files.upload',
    method: 'POST',
    headers: form.getHeaders(),
    rejectUnauthorized: false
  };
  var request = http.request(options, function(res) {
    var responseStr = '';
    res.on('data', function (chunk) {
      responseStr += chunk;
    });
    res.on('end', function (err) {
      callback(err, JSON.parse(responseStr));
    });
  });
  form.pipe(request);
};
