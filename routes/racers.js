var express = require('express');
var router = express.router();

/* GET home page. */
router.post('/', function(req, res, next) {
  res.json({ title: 'Express' });
});