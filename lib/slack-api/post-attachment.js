/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2017 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

const http = require('https');
const FormDataHandler = require('form-data');
const mime = require('mime');

/**
* Function to handle file uploads
* @param {string} channel channel to post file.
* @param {object} config responseType and proxy agent config.
* @param {object} data stream/buffer data.
*
* @return {object} Promise resolves to success or failure.
*/
exports = module.exports.postAttachmentFromStream =
  function (channel, config, data) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        const form = new FormDataHandler();
        const fileType = config.type || 'json';

        form.append('token', config.botToken);
        form.append('channels', channel[0]);
        form.append('file', data, {
          filename: config.name || config.commandName + '_graph.' + fileType,
          contentType: mime.getType(fileType),
          filetype: mime.getType(fileType),
        });

        const options = {
          host: 'slack.com',
          path: '/api/files.upload',
          method: 'POST',
          headers: form.getHeaders(),
          rejectUnauthorized: false,
        };

        if (config.agent) {
          options.agent = config.agent;
        }

        if (config.thread) {
          options.path = options.path + '?thread_ts=' + config.thread;
        }

        const request = http.request(options, (res) => {
          let responseStr = '';

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

        request.on('error', function (err) {
          onReject(err);
        });

        form.pipe(request);
      },
    });
  };
