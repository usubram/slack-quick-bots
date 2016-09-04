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
const mime = require('mime');

exports = module.exports.postAttachmentFromStream = function (channel, config, data) {
  return Promise.resolve({
    then: (onFulfill, onReject) => {
      var form = new FormDataHandler();
      var fileType = config.type || 'json';

      form.append('token', config.botToken);
      form.append('channels', channel[0]);
      form.append('file', data, {
        filename: config.name || config.commandName + '_graph.' + fileType,
        contentType: mime.lookup(fileType),
        filetype: mime.lookup(fileType)
      });

      var options = {
        host: 'slack.com',
        path: '/api/files.upload',
        method: 'POST',
        headers: form.getHeaders(),
        rejectUnauthorized: false
      };

      var request = http.request(options, function (res) {
        var responseStr = '';

        res.on('data', function (chunk) {
          responseStr += chunk;
        });

        res.on('end', function (err) {
          if (err) {
            return onReject(err);
          }
          let dataToSend;
          try {
            dataToSend = JSON.parse(responseStr);
            onFulfill(dataToSend);
          } catch (parseErr) {
            onReject(err);
          }
        });
      });
      form.pipe(request);
    }
  });
};
