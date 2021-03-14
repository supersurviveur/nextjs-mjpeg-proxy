// Copyright (C) 2013, Georges-Etienne Legendre <legege@legege.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

const MjpegProxy = require('../mjpeg-proxy').MjpegProxy;

const express = require('express');
const errorHandler = require('errorhandler');
const morgan = require('morgan');

const HTTP_PORT = 8080;

const cam1 = "http://192.168.2.31/videostream.cgi?user=admin&pwd=admin";
const cam2 = "http://192.168.2.30/videostream.cgi?user=admin&pwd=admin";

var app = express();
app.use(errorHandler({ dumpExceptions: true, showStack: true }));
app.use(morgan('tiny'));
app.set("view options", { layout: false });
app.use(express.static(__dirname + '/public'));

app.get('/index1.jpg', new MjpegProxy(cam1).proxyRequest);
app.get('/index2.jpg', new MjpegProxy(cam2).proxyRequest);

app.listen(HTTP_PORT);

console.log("Listening on port " + HTTP_PORT);
